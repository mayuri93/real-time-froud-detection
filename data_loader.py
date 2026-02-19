"""
Data Loader for Fraud Detection System
Loads and processes CSV data files
"""

import pandas as pd
import os

class DataLoader:
    def __init__(self):
        # CSV files are in the same folder as this script
        self.data_dir = os.path.dirname(os.path.abspath(__file__))
        print(f"Data loader initialized. Looking in: {self.data_dir}")
        
    def load_data(self, filename='synthetic_data.csv'):
        """Load data from CSV file"""
        # Check in the same directory as the script
        filepath = os.path.join(self.data_dir, filename)
        
        if os.path.exists(filepath):
            try:
                df = pd.read_csv(filepath)
                print(f"Loaded {filename} with {len(df)} rows")
                return df
            except Exception as e:
                print(f"Error loading {filepath}: {e}")
        
        # Try other CSV files if the requested one doesn't exist
        csv_files = [f for f in os.listdir(self.data_dir) if f.endswith('.csv')]
        for csv_file in csv_files:
            try:
                filepath = os.path.join(self.data_dir, csv_file)
                df = pd.read_csv(filepath)
                print(f"Loaded {csv_file} with {len(df)} rows")
                return df
            except Exception as e:
                print(f"Error loading {filepath}: {e}")
                continue
        
        # Create sample data if no file found
        print("Creating sample data...")
        return self._create_sample_data()
    
    def load_all_data(self):
        """Load all CSV files and combine"""
        dfs = []
        
        # Look in the same directory as this script
        if os.path.exists(self.data_dir):
            try:
                for filename in os.listdir(self.data_dir):
                    if filename.endswith('.csv'):
                        filepath = os.path.join(self.data_dir, filename)
                        df = pd.read_csv(filepath)
                        df['source_file'] = filename
                        dfs.append(df)
                        print(f"Loaded {filename} with {len(df)} rows")
            except Exception as e:
                print(f"Error loading from {self.data_dir}: {e}")
        
        if dfs:
            combined = pd.concat(dfs, ignore_index=True)
            print(f"Combined data: {len(combined)} rows")
            return combined
        else:
            return self._create_sample_data()
    
    def _create_sample_data(self):
        """Create sample data for demonstration"""
        import numpy as np
        
        np.random.seed(42)
        n = 1000
        
        data = {
            'transaction_id': range(1, n + 1),
            'timestamp': pd.date_range('2024-01-01', periods=n, freq='10min').astype(str),
            'amount': np.random.exponential(100, n),
            'transaction_type': np.random.choice(['purchase', 'transfer', 'withdrawal', 'payment'], n),
            'location': np.random.choice(['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 
                                         'Miami', 'Seattle', 'Boston', 'Atlanta', 'Denver'], n),
            'user_age': np.random.randint(18, 70, n),
            'account_age_days': np.random.randint(1, 3650, n),
            'gender': np.random.choice(['M', 'F'], n),
            'is_fraud': np.random.choice([0, 1], n, p=[0.95, 0.05])
        }
        
        df = pd.DataFrame(data)
        
        # Add some more realistic fraud patterns
        # High amounts are more likely to be fraud
        df.loc[df['amount'] > 500, 'is_fraud'] = 1
        
        return df
    
    def get_available_datasets(self):
        """Get list of available CSV files"""
        datasets = []
        
        if os.path.exists(self.data_dir):
            try:
                for filename in os.listdir(self.data_dir):
                    if filename.endswith('.csv'):
                        filepath = os.path.join(self.data_dir, filename)
                        size = os.path.getsize(filepath)
                        datasets.append({
                            'name': filename,
                            'size': size,
                            'path': filepath
                        })
            except Exception as e:
                print(f"Error listing {self.data_dir}: {e}")
        
        return datasets
