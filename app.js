/**
 * Fraud Detection Website - Main Application JavaScript
 * FIXED: Added missing functions for transactions and alerts
 */

// Connection Setup
const API_BASE = (window.location.port === '5000') ? '' : 'http://localhost:5000';
let reportChart = null; // Store the report chart instance locally

document.addEventListener('DOMContentLoaded', function() {
    setTimeout(initializeApp, 100);
});

function initializeApp() {
    console.log('App Started. API:', API_BASE);
    setupNavigation();
    setupEventListeners();
    
    // Load everything once on startup
    refreshAllData();
}

// --- MASTER REFRESH FUNCTION ---
async function refreshAllData() {
    console.log("Refreshing all data...");
    await loadDashboardData();
    await loadTransactions();
    await loadAlerts();
}

// --- REFRESH BUTTON (Cycle CSV Files) ---
async function handleRefresh() {
    const btn = document.getElementById('refresh-btn');
    const icon = btn.querySelector('i');
    icon.classList.add('fa-spin');
    
    try {
        // 1. Switch to Next CSV
        const response = await fetchAPI('/api/refresh', 'POST');
        
        // 2. Reload All Data (Graphs, Tables, Alerts)
        await refreshAllData();
        
        // 3. Update Title
        const headerTitle = document.querySelector('.page-header p');
        if(headerTitle) headerTitle.textContent = `Source: ${response.source} | Records: ${response.count}`;
        
        // 4. Reset Analysis
        document.getElementById('analysis-result')?.classList.add('hidden');
        
    } catch (error) {
        console.error("Refresh failed:", error);
    } finally {
        setTimeout(() => icon.classList.remove('fa-spin'), 500);
    }
}

// --- DASHBOARD GRAPHS ---
async function loadDashboardData() {
    try {
        const stats = await fetchAPI('/api/stats');
        
        // Update Stats Cards
        document.getElementById('total-transactions').textContent = formatNumber(stats.total_transactions);
        document.getElementById('fraud-transactions').textContent = formatNumber(stats.fraudulent_transactions);
        document.getElementById('legit-transactions').textContent = formatNumber(stats.legitimate_transactions);
        document.getElementById('fraud-rate').textContent = stats.fraud_rate + '%';
        
        // Update Charts
        await loadChartData();
        
    } catch (error) {
        console.error('Dashboard error:', error);
    }
}

async function loadChartData() {
    try {
        // Fetch all chart data in parallel
        const [fraudDist, amountDist, txType, locationRisk] = await Promise.all([
            fetchAPI('/api/chart/fraud-distribution'),
            fetchAPI('/api/chart/amount-distribution'),
            fetchAPI('/api/chart/transaction-type'),
            fetchAPI('/api/chart/location-risk')
        ]);
        
        // Update specific charts using global window.charts
        updateChart('fraudDistribution', fraudDist);
        updateChart('amountDistribution', amountDist);
        updateChart('transactionType', txType);
        updateChart('locationRisk', locationRisk);
        
    } catch (error) {
        console.error('Chart loading error:', error);
    }
}

function updateChart(name, data) {
    // Check if the chart exists in the global scope
    if (window.charts && window.charts[name]) {
        const chart = window.charts[name];
        
        // Update Labels and Data
        if (data.labels && data.data) {
            chart.data.labels = data.labels;
            chart.data.datasets[0].data = data.data;
            chart.update(); // Force redraw
        }
    } else {
        console.warn(`Chart '${name}' not found. Waiting for initialization...`);
    }
}

// --- RECENT TRANSACTIONS (Dashboard) ---
function updateRecentTransactions(txs) {
    const tbody = document.getElementById('recent-transactions-body');
    if (!tbody) return;
    
    if (!txs || txs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7">No recent transactions</td></tr>';
        return;
    }
    
    tbody.innerHTML = txs.map(tx => `
        <tr>
            <td>#${tx.id || tx.transaction_id || '-'}</td>
            <td>${tx.timestamp || '-'}</td>
            <td>$${formatNumber(tx.amount)}</td>
            <td>${tx.transaction_type || '-'}</td>
            <td>${tx.location || '-'}</td>
            <td><span class="status-badge ${tx.is_fraud ? 'fraud' : 'legit'}">${tx.is_fraud ? 'Fraud' : 'Legit'}</span></td>
            <td>${((tx.fraud_probability || 0) * 100).toFixed(1)}%</td>
        </tr>
    `).join('');
}

// --- ALERTS ---
function loadAlerts() {
    const alertsList = document.getElementById('alerts-list');
    const alertBadge = document.getElementById('alert-badge');
    
    if (!alertsList) return;
    
    // Fetch fraud transactions to create alerts
    fetchAPI('/api/transactions?page=1&per_page=100').then(data => {
        const txs = data.transactions || [];
        const fraudTxs = txs.filter(tx => tx.is_fraud === 1);
        
        // Update badge
        if (alertBadge) {
            alertBadge.textContent = fraudTxs.length;
        }
        
        if (fraudTxs.length === 0) {
            alertsList.innerHTML = `
                <div class="alert-item">
                    <div class="alert-icon success">
                        <i class="fas fa-check-circle"></i>
                    </div>
                    <div class="alert-content">
                        <div class="alert-title">No Fraud Detected</div>
                        <div class="alert-message">All transactions appear legitimate.</div>
                        <div class="alert-time">${new Date().toLocaleString()}</div>
                    </div>
                </div>
            `;
            return;
        }
        
        // Create alerts for fraudulent transactions
        const alertsHtml = fraudTxs.slice(0, 10).map(tx => `
            <div class="alert-item">
                <div class="alert-icon danger">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <div class="alert-content">
                    <div class="alert-title">Fraud Detected - Transaction #${tx.id || tx.transaction_id}</div>
                    <div class="alert-message">
                        Amount: <strong>$${formatNumber(tx.amount)}</strong> | 
                        Location: ${tx.location} | 
                        Type: ${tx.transaction_type}
                    </div>
                    <div class="alert-time">${tx.timestamp || 'Just now'}</div>
                </div>
            </div>
        `).join('');
        
        alertsList.innerHTML = alertsHtml;
    }).catch(error => {
        console.error('Error loading alerts:', error);
        alertsList.innerHTML = '<div class="alert-item"><div class="alert-content"><div class="alert-title">Error loading alerts</div></div></div>';
    });
}

// --- REPORTS GENERATION ---
async function generateReport(reportType) {
    const reportResult = document.getElementById('report-result');
    const reportContent = document.getElementById('report-content');
    const reportTitle = document.getElementById('report-title');
    
    // Show Modal
    reportResult.classList.add('active');
    reportTitle.textContent = reportType.replace('-', ' ').toUpperCase() + ' REPORT';
    reportContent.innerHTML = '<div class="report-loading"><div class="spinner"></div></div>';
    
    try {
        const data = await fetchAPI(`/api/report/${reportType}`, 'POST');
        renderReport(reportType, data);
    } catch (error) {
        reportContent.innerHTML = `<div class="report-error">Error: ${error.message}</div>`;
    }
}

function renderReport(type, data) {
    const contentEl = document.getElementById('report-content');
    
    // 1. Create Layout
    contentEl.innerHTML = `
        <div class="report-container" style="height: 350px; width: 100%; position: relative;">
            <canvas id="report-chart-canvas"></canvas>
        </div>
        <div class="report-stats" id="report-stats-container"></div>
    `;
    
    const ctx = document.getElementById('report-chart-canvas').getContext('2d');
    
    // 2. Destroy Old Report Chart
    if (reportChart) {
        reportChart.destroy();
        reportChart = null;
    }
    
    // 3. Configure Chart based on Type
    let config = {
        type: 'bar',
        data: { labels: [], datasets: [] },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom' } }
        }
    };
    
    if (type === 'summary') {
        config.type = 'doughnut';
        config.data = {
            labels: data.fraud_distribution.labels,
            datasets: [{
                data: data.fraud_distribution.data,
                backgroundColor: ['#10b981', '#ef4444'],
                borderWidth: 0
            }]
        };
        // Add text stats
        document.getElementById('report-stats-container').innerHTML = `
            <div class="stat-row">Total: <b>${formatNumber(data.statistics.total_transactions)}</b></div>
            <div class="stat-row">Fraud: <b style="color:#ef4444">${formatNumber(data.statistics.fraudulent_transactions)}</b></div>
            <div class="stat-row">Rate: <b>${data.statistics.fraud_rate}%</b></div>
        `;
    } 
    else if (type === 'geographic') {
        config.type = 'bar';
        config.options.indexAxis = 'y';
        config.data = {
            labels: data.location_risk.labels,
            datasets: [{
                label: 'Fraud Risk by Location',
                data: data.location_risk.data,
                backgroundColor: '#ef4444'
            }]
        };
    }
    else if (type === 'time-analysis') {
        config.type = 'line';
        config.data = {
            labels: data.hourly_data.map(h => h.hour + ':00'),
            datasets: [{
                label: 'Fraud Incidents',
                data: data.hourly_data.map(h => h.is_fraud),
                borderColor: '#ef4444',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                fill: true,
                tension: 0.4
            }]
        };
    }
    else if (type === 'user-behavior') {
        config.type = 'bar';
        config.data = {
            labels: data.transaction_type.labels,
            datasets: [{
                label: 'Fraud Count by Type',
                data: data.transaction_type.data,
                backgroundColor: '#f59e0b'
            }]
        };
    }
    
    // 4. Render
    reportChart = new Chart(ctx, config);
}

function closeReport() {
    document.getElementById('report-result').classList.remove('active');
    if (reportChart) {
        reportChart.destroy();
        reportChart = null;
    }
}


// --- TRANSACTIONS & ANALYZE ---
async function loadTransactions() {
    try {
        const data = await fetchAPI('/api/transactions?page=1&per_page=50');
        const txs = data.transactions || [];
        
        // Update recent transactions on dashboard
        updateRecentTransactions(txs.slice(0, 10));
        
        // Update all transactions table
        const tbody = document.getElementById('all-transactions-body');
        if (tbody) {
             if (txs.length === 0) {
                 tbody.innerHTML = '<tr><td colspan="8">No transactions found.</td></tr>';
             } else {
                 tbody.innerHTML = txs.map(tx => `
                    <tr>
                        <td>#${tx.id || tx.transaction_id || '-'}</td>
                        <td>${tx.timestamp || '-'}</td>
                        <td>$${formatNumber(tx.amount)}</td>
                        <td>${tx.transaction_type || '-'}</td>
                        <td>${tx.location || '-'}</td>
                        <td><span class="status-badge ${tx.is_fraud ? 'fraud' : 'legit'}">${tx.is_fraud ? 'Fraud' : 'Legit'}</span></td>
                        <td>${((tx.fraud_probability || 0) * 100).toFixed(1)}%</td>
                        <td><button class="btn-secondary">View</button></td>
                    </tr>
                `).join('');
             }
        }
    } catch (error) { 
        console.error('Error loading transactions:', error); 
        const tbody = document.getElementById('all-transactions-body');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="8">Error loading transactions.</td></tr>';
        }
    }
}

async function analyzeTransaction() {
    const amt = document.getElementById('analyze-amount').value;
    const type = document.getElementById('analyze-type').value;
    const loc = document.getElementById('analyze-location').value;
    
    if(!amt) { alert("Enter amount"); return; }
    
    try {
        const res = await fetchAPI('/api/analyze', 'POST', { amount: parseFloat(amt), transaction_type: type, location: loc });
        document.getElementById('analysis-result').classList.remove('hidden');
        document.getElementById('result-prediction').textContent = res.is_fraud ? "FRAUD DETECTED" : "Legitimate";
        document.getElementById('result-prediction').style.color = res.is_fraud ? "#ef4444" : "#10b981";
        document.getElementById('result-probability').textContent = (res.fraud_probability * 100).toFixed(2) + "%";
        document.getElementById('result-risk').textContent = res.risk_level;
        document.getElementById('result-recommendation').textContent = res.recommendation;
    } catch (e) { alert("Analysis failed"); }
}

// --- UTILS ---
async function fetchAPI(url, method = 'GET', data = null) {
    const options = { method, headers: { 'Content-Type': 'application/json' } };
    if (data) options.body = JSON.stringify(data);
    const res = await fetch(API_BASE + url, options);
    if (!res.ok) throw new Error(res.statusText);
    return await res.json();
}

function formatNumber(num) { return num ? num.toLocaleString() : '0'; }

function setupEventListeners() {
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) refreshBtn.addEventListener('click', handleRefresh);
    
    // Export button
    const exportBtn = document.getElementById('export-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', async () => {
            try {
                const response = await fetch(API_BASE + '/api/export');
                if (response.ok) {
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'fraud_data_export.csv';
                    a.click();
                    window.URL.revokeObjectURL(url);
                }
            } catch (error) {
                console.error('Export failed:', error);
                alert('Export failed');
            }
        });
    }
    
    // Global search
    const searchInput = document.getElementById('global-search');
    if (searchInput) {
        searchInput.addEventListener('keyup', async (e) => {
            if (e.key === 'Enter') {
                const q = searchInput.value.trim();
                if (q) {
                    try {
                        const results = await fetchAPI('/api/search?q=' + encodeURIComponent(q));
                        // Show search results in transactions table
                        const tbody = document.getElementById('all-transactions-body');
                        if (tbody && results.length > 0) {
                            tbody.innerHTML = results.map(tx => `
                                <tr>
                                    <td>#${tx.id || tx.transaction_id || '-'}</td>
                                    <td>${tx.timestamp || '-'}</td>
                                    <td>$${formatNumber(tx.amount)}</td>
                                    <td>${tx.transaction_type || '-'}</td>
                                    <td>${tx.location || '-'}</td>
                                    <td><span class="status-badge ${tx.is_fraud ? 'fraud' : 'legit'}">${tx.is_fraud ? 'Fraud' : 'Legit'}</span></td>
                                    <td>${((tx.fraud_probability || 0) * 100).toFixed(1)}%</td>
                                    <td><button class="btn-secondary">View</button></td>
                                </tr>
                            `).join('');
                            // Switch to transactions page
                            document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
                            document.getElementById('transactions-page').classList.remove('hidden');
                            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
                            document.querySelector('[data-page="transactions"]').classList.add('active');
                        }
                    } catch (error) {
                        console.error('Search failed:', error);
                    }
                }
            }
        });
    }
}

function setupNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', e => {
            e.preventDefault();
            document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
            document.getElementById(item.dataset.page + '-page').classList.remove('hidden');
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            item.classList.add('active');
            
            // Load data when switching to specific pages
            if (item.dataset.page === 'transactions') {
                loadTransactions();
            } else if (item.dataset.page === 'alerts') {
                loadAlerts();
            }
        });
    });
}

// --- EXPORTS ---
window.generateReport = generateReport;
window.closeReport = closeReport;
window.loadTransactions = loadTransactions;
window.loadAlerts = loadAlerts;
window.analyzeTransaction = analyzeTransaction;
