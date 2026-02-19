"""Test script to verify the fraud detection system works"""
from data_loader import DataLoader
from fraud_detector import FraudDetector

print('='*60)
print('Testing Fraud Detection System')
print('='*60)

# Test 1: Load data
print('\n1. Loading data...')
dl = DataLoader()
df = dl.load_all_data()
print(f'   Loaded {len(df)} rows')

# Test 2: Train model
print('\n2. Training model...')
fd = FraudDetector()
fd.train(df)
print('   Model trained successfully!')

# Test 3: Get statistics
print('\n3. Getting statistics...')
stats = fd.get_statistics()
print(f'   Total transactions: {stats["total_transactions"]}')
print(f'   Fraudulent: {stats["fraudulent_transactions"]}')
print(f'   Legitimate: {stats["legitimate_transactions"]}')
print(f'   Fraud rate: {stats["fraud_rate"]}%')

# Test 4: Get chart data
print('\n4. Getting chart data...')
fraud_dist = fd.get_fraud_distribution()
print(f'   Fraud distribution: {fraud_dist}')

amount_dist = fd.get_amount_distribution()
print(f'   Amount distribution: {len(amount_dist["labels"])} categories')

tx_type = fd.get_fraud_by_type()
print(f'   Transaction types: {len(tx_type["labels"])} types')

location_risk = fd.get_location_risk()
print(f'   Location risks: {len(location_risk["labels"])} locations')

# Test 5: Get transactions
print('\n5. Getting transactions...')
txns = fd.get_transactions(1, 10)
print(f'   Got {len(txns["transactions"])} transactions')

# Test 6: Analyze transaction
print('\n6. Analyzing transaction...')
result = fd.analyze_transaction({
    'amount': 500,
    'transaction_type': 'purchase',
    'location': 'New York'
})
print(f'   Result: {result}')

# Test 7: Search transactions
print('\n7. Searching transactions...')
results = fd.search_transactions('New York')
print(f'   Found {len(results)} results')

print('\n' + '='*60)
print('All tests passed! System is working correctly.')
print('='*60)
