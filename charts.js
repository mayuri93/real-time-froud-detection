/**
 * Fraud Detection Website - Chart.js Visualizations
 */

// Global charts object
window.charts = {};

// Wait for DOM and Chart.js to be ready
document.addEventListener('DOMContentLoaded', function() {
    // Wait for Chart.js to load
    if (typeof Chart !== 'undefined') {
        initializeCharts();
    } else {
        // Wait a bit for Chart.js to load from CDN
        setTimeout(initializeCharts, 500);
    }
});

function initializeCharts() {
    console.log('Initializing charts...');
    
    // Set default configurations
    if (typeof Chart !== 'undefined') {
        Chart.defaults.color = '#94a3b8';
        Chart.defaults.borderColor = '#334155';
        Chart.defaults.font.family = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    }
    
    initFraudDistributionChart();
    initAmountDistributionChart();
    initTransactionTypeChart();
    initLocationRiskChart();
    
    console.log('Charts initialized:', Object.keys(window.charts));
    
    // Notify app.js that charts are ready
    if (window.appChartsReady) {
        window.appChartsReady();
    }
}

// Fraud Distribution Chart (Doughnut)
function initFraudDistributionChart() {
    const ctx = document.getElementById('fraud-distribution-chart');
    if (!ctx) {
        console.warn('Fraud distribution chart canvas not found');
        return;
    }
    
    // Destroy existing chart if it exists
    if (window.charts.fraudDistribution) {
        window.charts.fraudDistribution.destroy();
    }
    
    window.charts.fraudDistribution = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Legitimate', 'Fraudulent'],
            datasets: [{
                data: [0, 0],
                backgroundColor: [
                    '#10b981', // Green for legitimate
                    '#ef4444'  // Red for fraud
                ],
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// Amount Distribution Chart (Bar)
function initAmountDistributionChart() {
    const ctx = document.getElementById('amount-distribution-chart');
    if (!ctx) {
        console.warn('Amount distribution chart canvas not found');
        return;
    }
    
    // Destroy existing chart if it exists
    if (window.charts.amountDistribution) {
        window.charts.amountDistribution.destroy();
    }
    
    window.charts.amountDistribution = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Transactions',
                data: [],
                backgroundColor: 'rgba(79, 70, 229, 0.8)',
                borderColor: '#4f46e5',
                borderWidth: 1,
                borderRadius: 6,
                hoverBackgroundColor: '#4f46e5'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: '#1e293b',
                    titleColor: '#f8fafc',
                    bodyColor: '#94a3b8',
                    borderColor: '#334155',
                    borderWidth: 1,
                    padding: 12,
                    cornerRadius: 8
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        font: {
                            size: 11
                        }
                    }
                },
                y: {
                    grid: {
                        color: '#334155'
                    },
                    ticks: {
                        font: {
                            size: 11
                        }
                    }
                }
            }
        }
    });
}

// Transaction Type Chart (Horizontal Bar)
function initTransactionTypeChart() {
    const ctx = document.getElementById('transaction-type-chart');
    if (!ctx) {
        console.warn('Transaction type chart canvas not found');
        return;
    }
    
    // Destroy existing chart if it exists
    if (window.charts.transactionType) {
        window.charts.transactionType.destroy();
    }
    
    window.charts.transactionType = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Fraud Count',
                data: [],
                backgroundColor: [
                    'rgba(239, 68, 68, 0.8)',
                    'rgba(245, 158, 11, 0.8)',
                    'rgba(6, 182, 212, 0.8)',
                    'rgba(16, 185, 129, 0.8)',
                    'rgba(79, 70, 229, 0.8)'
                ],
                borderWidth: 0,
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: '#1e293b',
                    titleColor: '#f8fafc',
                    bodyColor: '#94a3b8',
                    borderColor: '#334155',
                    borderWidth: 1,
                    padding: 12,
                    cornerRadius: 8,
                    callbacks: {
                        label: function(context) {
                            return `Fraud Count: ${context.raw}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        color: '#334155'
                    },
                    ticks: {
                        callback: function(value) {
                            return value;
                        }
                    }
                },
                y: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

// Location Risk Chart (Polar Area)
function initLocationRiskChart() {
    const ctx = document.getElementById('location-risk-chart');
    if (!ctx) {
        console.warn('Location risk chart canvas not found');
        return;
    }
    
    // Destroy existing chart if it exists
    if (window.charts.locationRisk) {
        window.charts.locationRisk.destroy();
    }
    
    window.charts.locationRisk = new Chart(ctx, {
        type: 'polarArea',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: [
                    'rgba(239, 68, 68, 0.7)',
                    'rgba(245, 158, 11, 0.7)',
                    'rgba(6, 182, 212, 0.7)',
                    'rgba(16, 185, 129, 0.7)',
                    'rgba(79, 70, 229, 0.7)',
                    'rgba(236, 72, 153, 0.7)',
                    'rgba(34, 197, 94, 0.7)',
                    'rgba(168, 85, 247, 0.7)',
                    'rgba(249, 115, 22, 0.7)',
                    'rgba(20, 184, 166, 0.7)'
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        padding: 15,
                        usePointStyle: true,
                        pointStyle: 'circle',
                        font: {
                            size: 10
                        }
                    }
                },
                tooltip: {
                    backgroundColor: '#1e293b',
                    titleColor: '#f8fafc',
                    bodyColor: '#94a3b8',
                    borderColor: '#334155',
                    borderWidth: 1,
                    padding: 12,
                    cornerRadius: 8,
                    callbacks: {
                        label: function(context) {
                            return `Fraud Count: ${context.raw}`;
                        }
                    }
                }
            },
            scales: {
                r: {
                    grid: {
                        color: '#334155'
                    },
                    ticks: {
                        display: false
                    }
                }
            }
        }
    });
}

// Export functions for use in other modules
window.FraudCharts = {
    initializeCharts,
    initFraudDistributionChart,
    initAmountDistributionChart,
    initTransactionTypeChart,
    initLocationRiskChart
};
