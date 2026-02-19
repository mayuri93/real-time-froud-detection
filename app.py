"""
Flask application for Real-Time Fraud Detection Website
"""
import os
import pandas as pd
from flask import Flask, render_template, jsonify, request, send_from_directory
from flask_cors import CORS
from fraud_detector import FraudDetector
from data_loader import DataLoader

app = Flask(__name__, template_folder='.')
CORS(app)

# Global variables to store state
data_loader = None
fraud_detector = None
current_file_index = -1  # -1 means "All Data", 0+ means specific file
available_files = []

def init_system():
    global data_loader, fraud_detector, available_files, current_file_index
    print("="*60)
    print("Initializing Fraud Detection System...")
    data_loader = DataLoader()
    fraud_detector = FraudDetector()
    
    # Get list of CSV files
    datasets = data_loader.get_available_datasets()
    available_files = [d['name'] for d in datasets]
    print(f"Found datasets: {available_files}")
    
    # Start by loading ALL data
    current_file_index = -1
    load_current_data()
    print("System Ready!")
    print("="*60)

def load_current_data():
    """Helper to load data based on current_file_index"""
    global fraud_detector, data_loader, current_file_index, available_files
    
    filename = "All Data Combined"
    
    try:
        if current_file_index == -1:
            # Load ALL data
            df = data_loader.load_all_data()
        else:
            # Load SPECIFIC file
            target_file = available_files[current_file_index]
            df = data_loader.load_data(target_file)
            filename = target_file
            
        print(f"Loading dataset: {filename} ({len(df)} records)")
        fraud_detector.train(df)
        return filename, len(df)
    except Exception as e:
        print(f"Error loading data: {e}")
        return "Error", 0

# Initialize on startup
init_system()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/<path:filename>')
def serve_static(filename):
    return send_from_directory('.', filename)

# --- REFRESH: CYCLES CSV FILES ---
@app.route('/api/refresh', methods=['POST'])
def refresh_data():
    global current_file_index, available_files
    
    # Cycle index: -1 -> 0 -> 1 -> ... -> -1
    if not available_files:
        current_file_index = -1
    else:
        current_file_index += 1
        if current_file_index >= len(available_files):
            current_file_index = -1 # Go back to "All Data"
            
    # Load the new data
    filename, count = load_current_data()
    
    return jsonify({
        'status': 'success', 
        'source': filename, 
        'count': count,
        'message': f'Switched to {filename}'
    })

# --- API ENDPOINTS ---

@app.route('/api/stats')
def get_stats():
    return jsonify(fraud_detector.get_statistics())

@app.route('/api/transactions')
def get_transactions():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 50, type=int)
    return jsonify(fraud_detector.get_transactions(page, per_page))

@app.route('/api/analyze', methods=['POST'])
def analyze_transaction():
    return jsonify(fraud_detector.analyze_transaction(request.json))

@app.route('/api/search')
def search():
    q = request.args.get('q', '')
    return jsonify(fraud_detector.search_transactions(q))

# --- CHART DATA APIs ---
@app.route('/api/chart/fraud-distribution')
def chart_fraud(): 
    return jsonify(fraud_detector.get_fraud_distribution())

@app.route('/api/chart/amount-distribution')
def chart_amount(): 
    return jsonify(fraud_detector.get_amount_distribution())

@app.route('/api/chart/transaction-type')
def chart_type(): 
    return jsonify(fraud_detector.get_fraud_by_type())

@app.route('/api/chart/location-risk')
def chart_location(): 
    return jsonify(fraud_detector.get_location_risk())

# --- REPORT APIs ---
@app.route('/api/report/summary', methods=['POST'])
def report_summary():
    return jsonify({
        'statistics': fraud_detector.get_statistics(),
        'fraud_distribution': fraud_detector.get_fraud_distribution(),
        'report_type': 'summary'
    })

@app.route('/api/report/geographic', methods=['POST'])
def report_geo():
    return jsonify({
        'location_risk': fraud_detector.get_location_risk(),
        'location_details': [],
        'report_type': 'geographic'
    })

@app.route('/api/report/time-analysis', methods=['POST'])
def report_time():
    # Helper to safely process time data
    try:
        df = fraud_detector.df.copy()
        if 'timestamp' in df.columns and not df.empty:
            df['timestamp'] = pd.to_datetime(df['timestamp'], errors='coerce')
            df['hour'] = df['timestamp'].dt.hour
            hourly = df.groupby('hour')['is_fraud'].sum().reset_index()
            # Fill missing hours
            full_hours = pd.DataFrame({'hour': range(24)})
            hourly = full_hours.merge(hourly, on='hour', how='left').fillna(0)
            
            return jsonify({
                'hourly_data': hourly.to_dict('records'),
                'report_type': 'time_analysis'
            })
    except Exception as e:
        print(f"Time report error: {e}")
        
    # Fallback empty data structure that won't break charts
    return jsonify({
        'hourly_data': [{'hour': i, 'is_fraud': 0} for i in range(24)],
        'report_type': 'time_analysis'
    })

@app.route('/api/report/user-behavior', methods=['POST'])
def report_user():
    return jsonify({
        'age_analysis': {'labels': [], 'data': []}, 
        'transaction_type': fraud_detector.get_fraud_by_type(),
        'report_type': 'user_behavior'
    })

# --- EXPORT DATA API ---
@app.route('/api/export', methods=['GET'])
def export_data():
    """Download the current dataset as a CSV file"""
    try:
        if fraud_detector.df is not None:
            csv_data = fraud_detector.df.to_csv(index=False)
            
            from flask import Response
            return Response(
                csv_data,
                mimetype="text/csv",
                headers={"Content-disposition": "attachment; filename=fraud_data_export.csv"}
            )
        else:
            return jsonify({'error': 'No data to export'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    print("Server running at http://localhost:5000")
    app.run(debug=True, host='0.0.0.0', port=5000)
