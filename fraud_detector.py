import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
import warnings
warnings.filterwarnings('ignore')

class FraudDetector:
    def __init__(self):
        self.model = None
        self.label_encoders = {}
        self.df = None
        
    def train(self, df):
        print(f"Training on {len(df)} rows...")
        self.df = df.copy()
        
        # 1. CLEAN DATA - Handle missing columns gracefully
        if 'is_fraud' not in self.df.columns: 
            self.df['is_fraud'] = 0
            
        # Ensure amount is numeric
        self.df['amount'] = pd.to_numeric(self.df['amount'], errors='coerce').fillna(0)
        
        # Handle transaction_type - use device_type if transaction_type doesn't exist
        if 'transaction_type' not in self.df.columns:
            if 'device_type' in self.df.columns:
                self.df['transaction_type'] = self.df['device_type'].astype(str).str.lower().fillna('unknown')
            else:
                # Create random transaction types if neither exists
                self.df['transaction_type'] = np.random.choice(['purchase', 'transfer', 'withdrawal', 'payment'], len(self.df))
        else:
            self.df['transaction_type'] = self.df['transaction_type'].astype(str).str.lower().fillna('unknown')
        
        # Handle location
        if 'location' not in self.df.columns:
            self.df['location'] = 'Unknown'
        else:
            self.df['location'] = self.df['location'].astype(str).str.title().fillna('Unknown')
        
        # 2. ENCODE CATEGORICAL FEATURES
        for col in ['transaction_type', 'location']:
            le = LabelEncoder()
            # Fit on the data + 'unknown' to handle future unseen values safely
            unique_vals = list(self.df[col].unique()) + ['unknown']
            le.fit(unique_vals)
            self.df[col + '_encoded'] = le.transform(self.df[col])
            self.label_encoders[col] = le
            
        # 3. TRAIN MODEL
        features = ['amount', 'transaction_type_encoded', 'location_encoded']
        X = self.df[features]
        y = self.df['is_fraud']
        
        try:
            self.model = RandomForestClassifier(n_estimators=20, max_depth=10, random_state=42)
            self.model.fit(X, y)
            # Add probability to dataframe for display
            self.df['fraud_probability'] = self.model.predict_proba(X)[:, 1]
            print("Model trained successfully!")
        except Exception as e:
            print(f"Training Error: {e}")
            self.df['fraud_probability'] = 0.0
            
    def analyze_transaction(self, data):
        """Analyze a single transaction"""
        if self.model is None:
            return {'error': 'Model not trained', 'is_fraud': 0, 'fraud_probability': 0, 'risk_level': 'UNKNOWN', 'recommendation': 'Wait'}
        
        try:
            # 1. Prepare Input
            amount = float(data.get('amount', 0))
            tx_type = str(data.get('transaction_type', 'unknown')).lower()
            location = str(data.get('location', 'unknown')).title()
            
            # 2. Encode Input (Safe handling for unseen values)
            try:
                type_enc = self.label_encoders['transaction_type'].transform([tx_type])[0]
            except:
                type_enc = self.label_encoders['transaction_type'].transform(['unknown'])[0]
                
            try:
                loc_enc = self.label_encoders['location'].transform([location])[0]
            except:
                loc_enc = self.label_encoders['location'].transform(['unknown'])[0]
                
            # 3. Predict
            features = [[amount, type_enc, loc_enc]]
            prediction = int(self.model.predict(features)[0])
            prob = float(self.model.predict_proba(features)[0][1])
            
            # 4. Result
            return {
                'is_fraud': prediction,
                'fraud_probability': prob,
                'risk_level': 'HIGH' if prob > 0.7 else ('MEDIUM' if prob > 0.3 else 'LOW'),
                'recommendation': 'BLOCK' if prob > 0.7 else ('REVIEW' if prob > 0.3 else 'APPROVE')
            }
        except Exception as e:
            print(f"Analysis Error: {e}")
            return {'is_fraud': 0, 'fraud_probability': 0.0, 'risk_level': 'ERROR', 'recommendation': 'CHECK LOGS'}

    # --- GETTERS ---
    def get_statistics(self):
        if self.df is None: 
            return {'total_transactions': 0, 'fraudulent_transactions': 0, 'legitimate_transactions': 0, 'fraud_rate': 0}
        total = len(self.df)
        fraud = int(self.df['is_fraud'].sum())
        return {
            'total_transactions': total,
            'fraudulent_transactions': fraud,
            'legitimate_transactions': total - fraud,
            'fraud_rate': round((fraud/total)*100, 2) if total else 0
        }

    def get_transactions(self, page=1, per_page=50):
        if self.df is None: 
            return {'transactions': [], 'total_pages': 0}
        start = (page-1)*per_page
        end = min(start + per_page, len(self.df))
        subset = self.df.iloc[start:end]
        
        # Convert to list of dicts with proper formatting
        transactions = []
        for _, row in subset.iterrows():
            tx = {
                'id': int(row.get('transaction_id', 0)),
                'timestamp': str(row.get('timestamp', '-')),
                'amount': float(row.get('amount', 0)),
                'transaction_type': str(row.get('transaction_type', 'unknown')),
                'location': str(row.get('location', 'unknown')),
                'is_fraud': int(row.get('is_fraud', 0)),
                'fraud_probability': float(row.get('fraud_probability', 0))
            }
            transactions.append(tx)
        
        return {
            'transactions': transactions,
            'total_pages': (len(self.df)//per_page)+1
        }
        
    def get_fraud_distribution(self):
        if self.df is None: 
            return {'labels': [], 'data': []}
        vc = self.df['is_fraud'].value_counts()
        return {
            'labels': ['Legitimate', 'Fraudulent'],
            'data': [int(vc.get(0, 0)), int(vc.get(1, 0))]
        }
        
    def get_amount_distribution(self):
        if self.df is None: 
            return {'labels': [], 'data': []}
        # Use bins that make sense for the data
        bins = [0, 100, 500, 1000, 3000, 5000, 10000]
        labels = ['0-100', '100-500', '500-1k', '1k-3k', '3k-5k', '5k+']
        
        try:
            cats = pd.cut(self.df['amount'], bins=bins, labels=labels, include_lowest=True)
            vc = cats.value_counts().sort_index()
            # Filter out any NaN values
            vc = vc.dropna()
            return {'labels': [str(x) for x in vc.index], 'data': [int(x) for x in vc.values]}
        except Exception as e:
            print(f"Amount distribution error: {e}")
            return {'labels': ['0-100'], 'data': [0]}
        
    def get_fraud_by_type(self):
        if self.df is None: 
            return {'labels': [], 'data': []}
        # Count frauds per transaction type
        try:
            fraud_df = self.df[self.df['is_fraud']==1]
            if fraud_df.empty:
                # Return all types with 0 if no fraud
                types = self.df['transaction_type'].unique()
                return {'labels': [str(x).title() for x in types], 'data': [0]*len(types)}
            
            grp = fraud_df.groupby('transaction_type').size()
            return {'labels': [str(x).title() for x in grp.index], 'data': [int(x) for x in grp.values]}
        except Exception as e:
            print(f"Fraud by type error: {e}")
            return {'labels': [], 'data': []}
        
    def get_location_risk(self):
        if self.df is None: 
            return {'labels': [], 'data': []}
        # Return top 5 locations by fraud COUNT
        try:
            fraud_df = self.df[self.df['is_fraud']==1]
            if fraud_df.empty:
                return {'labels': ['No Fraud Data'], 'data': [0]}
            
            grp = fraud_df.groupby('location').size().sort_values(ascending=False).head(5)
            return {'labels': list(grp.index), 'data': [int(x) for x in grp.values]}
        except Exception as e:
            print(f"Location risk error: {e}")
            return {'labels': [], 'data': []}
        
    def search_transactions(self, q):
        if self.df is None or not q: 
            return []
        q = str(q).lower()
        try:
            mask = self.df['location'].str.lower().str.contains(q, na=False) | \
                   self.df['transaction_type'].str.lower().str.contains(q, na=False) | \
                   self.df['amount'].astype(str).str.contains(q, na=False)
            results = self.df[mask].head(20)
            
            # Format results
            transactions = []
            for _, row in results.iterrows():
                tx = {
                    'id': int(row.get('transaction_id', 0)),
                    'timestamp': str(row.get('timestamp', '-')),
                    'amount': float(row.get('amount', 0)),
                    'transaction_type': str(row.get('transaction_type', 'unknown')),
                    'location': str(row.get('location', 'unknown')),
                    'is_fraud': int(row.get('is_fraud', 0)),
                    'fraud_probability': float(row.get('fraud_probability', 0))
                }
                transactions.append(tx)
            return transactions
        except Exception as e:
            print(f"Search error: {e}")
            return []
