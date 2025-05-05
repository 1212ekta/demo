// Main application JavaScript for Crypto Analysis Platform

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize components
    initApp();
});

// Global variables
let cryptoList = [];
let currentCrypto = null;
let priceChart = null;
let volumeChart = null;
let performanceChart = null;

// Initialize the application
function initApp() {
    // Get current page section
    const isHomePage = document.getElementById('market-overview') !== null;
    const isAnalysisPage = document.getElementById('crypto-analysis') !== null;
    
    // Initialize sections based on current page
    if (isHomePage) {
        loadMarketOverview();
    }
    
    if (isAnalysisPage) {
        loadCryptocurrencies();
        
        // Set up event listeners for crypto analysis
        const cryptoSelect = document.getElementById('crypto-select');
        const timeRange = document.getElementById('time-range');
        
        if (cryptoSelect) {
            cryptoSelect.addEventListener('change', handleCryptoChange);
        }
        
        if (timeRange) {
            timeRange.addEventListener('change', handleTimeRangeChange);
        }
    }
    
    // Show main content and hide loading spinner on all pages
    setTimeout(() => {
        const loadingSpinner = document.getElementById('loading-spinner');
        if (loadingSpinner) {
            loadingSpinner.classList.add('d-none');
        }
    }, 1000);
}

// Load global market overview data
function loadMarketOverview() {
    fetch('/api/market-overview')
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to fetch market overview');
            }
            return response.json();
        })
        .then(data => {
            updateMarketOverview(data);
            return fetch('/api/trending');
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to fetch trending cryptocurrencies');
            }
            return response.json();
        })
        .then(data => {
            updateTrendingTable(data);
        })
        .catch(error => {
            console.error('Error:', error);
            showErrorMessage('Failed to load market data. Please try again later.');
        });
}

// Update market overview UI elements
function updateMarketOverview(data) {
    if (!data || !data.data) {
        return;
    }
    
    const marketData = data.data;
    
    // Format market cap data
    const marketCap = formatCurrency(marketData.total_market_cap.usd);
    const marketCapChange = formatPercentage(marketData.market_cap_change_percentage_24h_usd);
    const marketCapChangeClass = marketData.market_cap_change_percentage_24h_usd >= 0 ? 'positive' : 'negative';
    
    // Update market cap element if it exists
    const globalMarketCapElement = document.getElementById('global-market-cap');
    if (globalMarketCapElement) {
        globalMarketCapElement.textContent = marketCap;
    }
    
    // Update market cap change element if it exists
    const marketCapChangeElement = document.getElementById('market-cap-change');
    if (marketCapChangeElement) {
        marketCapChangeElement.textContent = marketCapChange;
        marketCapChangeElement.className = marketCapChangeClass;
    }
    
    // Format and update volume if element exists
    const volume = formatCurrency(marketData.total_volume.usd);
    const globalVolumeElement = document.getElementById('global-volume');
    if (globalVolumeElement) {
        globalVolumeElement.textContent = volume;
    }
    
    // Format and update BTC dominance if element exists
    const btcDominance = formatPercentage(marketData.market_cap_percentage.btc);
    const btcDominanceElement = document.getElementById('btc-dominance');
    if (btcDominanceElement) {
        btcDominanceElement.textContent = btcDominance;
    }
}

// Update trending cryptocurrencies table
function updateTrendingTable(data) {
    if (!data || !data.coins || !data.coins.length) {
        return;
    }
    
    const tableBody = document.querySelector('#trending-table tbody');
    
    // If trending table doesn't exist on this page, exit early
    if (!tableBody) {
        return;
    }
    
    const trendingCoins = data.coins.slice(0, 7); // Show top 7 trending
    tableBody.innerHTML = ''; // Clear existing rows
    
    trendingCoins.forEach((coin, index) => {
        const item = coin.item;
        
        // Create new row
        const row = document.createElement('tr');
        
        // Create cells
        const rankCell = document.createElement('td');
        rankCell.textContent = index + 1;
        
        const nameCell = document.createElement('td');
        nameCell.innerHTML = `
            <div class="d-flex align-items-center">
                <img src="${item.small}" alt="${item.name}" class="me-2" style="width: 24px; height: 24px;">
                <div>
                    <div>${item.name}</div>
                    <small class="text-muted">${item.symbol}</small>
                </div>
            </div>
        `;
        
        const priceCell = document.createElement('td');
        if (item.data && item.data.price) {
            priceCell.textContent = item.data.price;
        } else {
            priceCell.textContent = 'N/A';
        }
        
        const changeCell = document.createElement('td');
        if (item.data && item.data.price_change_percentage_24h) {
            const change = formatPercentage(item.data.price_change_percentage_24h.usd);
            const changeClass = item.data.price_change_percentage_24h.usd >= 0 ? 'positive' : 'negative';
            changeCell.textContent = change;
            changeCell.className = changeClass;
        } else {
            changeCell.textContent = 'N/A';
        }
        
        // Append cells to row
        row.appendChild(rankCell);
        row.appendChild(nameCell);
        row.appendChild(priceCell);
        row.appendChild(changeCell);
        
        // Append row to table
        tableBody.appendChild(row);
    });
}

// Load list of cryptocurrencies for dropdown
function loadCryptocurrencies() {
    fetch('/api/cryptocurrencies?limit=100')
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to fetch cryptocurrencies');
            }
            return response.json();
        })
        .then(data => {
            cryptoList = data;
            populateCryptoDropdown(data);
        })
        .catch(error => {
            console.error('Error:', error);
            showErrorMessage('Failed to load cryptocurrency list. Please try again later.');
        });
}

// Populate cryptocurrency dropdown
function populateCryptoDropdown(cryptos) {
    const dropdown = document.getElementById('crypto-select');
    
    // Exit if dropdown doesn't exist on this page
    if (!dropdown) {
        return;
    }
    
    // Clear existing options except the placeholder
    while (dropdown.options.length > 1) {
        dropdown.remove(1);
    }
    
    // Add crypto options
    cryptos.forEach(crypto => {
        const option = document.createElement('option');
        option.value = crypto.id;
        option.textContent = `${crypto.name} (${crypto.symbol.toUpperCase()})`;
        dropdown.appendChild(option);
    });
}

// Handle cryptocurrency selection change
function handleCryptoChange(event) {
    const coinId = event.target.value;
    
    if (!coinId) {
        // Hide analysis if nothing selected
        document.getElementById('crypto-info').classList.add('d-none');
        document.getElementById('crypto-analysis-section').classList.add('d-none');
        document.getElementById('no-crypto-selected').classList.remove('d-none');
        return;
    }
    
    // Show loading state
    document.getElementById('no-crypto-selected').classList.add('d-none');
    document.getElementById('crypto-info').classList.add('d-none');
    document.getElementById('crypto-analysis-section').classList.add('d-none');
    document.getElementById('loading-spinner').classList.remove('d-none');
    
    // Get time range
    const timeRange = document.getElementById('time-range').value;
    
    // Fetch cryptocurrency details
    Promise.all([
        fetch(`/api/cryptocurrency/${coinId}`).then(res => res.json()),
        fetch(`/api/cryptocurrency/${coinId}/price-history?days=${timeRange}`).then(res => res.json()),
        fetch(`/api/cryptocurrency/${coinId}/analysis?days=${timeRange}`).then(res => res.json())
    ])
    .then(([details, priceHistory, analysis]) => {
        // Hide loading spinner
        document.getElementById('loading-spinner').classList.add('d-none');
        
        // Store current crypto
        currentCrypto = {
            details: details,
            priceHistory: priceHistory,
            analysis: analysis
        };
        
        // Update UI
        updateCryptoInfo(details);
        updateAnalysis(analysis);
        updateCharts(priceHistory, analysis);
        
        // Show analysis sections
        document.getElementById('crypto-info').classList.remove('d-none');
        document.getElementById('crypto-analysis-section').classList.remove('d-none');
    })
    .catch(error => {
        console.error('Error:', error);
        document.getElementById('loading-spinner').classList.add('d-none');
        document.getElementById('no-crypto-selected').classList.remove('d-none');
        showErrorMessage('Failed to load cryptocurrency data. Please try again later.');
    });
}

// Handle time range change
function handleTimeRangeChange(event) {
    const timeRange = event.target.value;
    const cryptoSelect = document.getElementById('crypto-select');
    const coinId = cryptoSelect.value;
    
    if (!coinId) {
        return;
    }
    
    // Show loading state
    document.getElementById('loading-spinner').classList.remove('d-none');
    document.getElementById('crypto-analysis-section').classList.add('d-none');
    
    // Fetch new data
    Promise.all([
        fetch(`/api/cryptocurrency/${coinId}/price-history?days=${timeRange}`).then(res => res.json()),
        fetch(`/api/cryptocurrency/${coinId}/analysis?days=${timeRange}`).then(res => res.json())
    ])
    .then(([priceHistory, analysis]) => {
        // Hide loading spinner
        document.getElementById('loading-spinner').classList.add('d-none');
        
        // Update current crypto
        currentCrypto.priceHistory = priceHistory;
        currentCrypto.analysis = analysis;
        
        // Update UI
        updateAnalysis(analysis);
        updateCharts(priceHistory, analysis);
        
        // Show analysis section
        document.getElementById('crypto-analysis-section').classList.remove('d-none');
    })
    .catch(error => {
        console.error('Error:', error);
        document.getElementById('loading-spinner').classList.add('d-none');
        showErrorMessage('Failed to update cryptocurrency data. Please try again later.');
    });
}

// Update cryptocurrency information
function updateCryptoInfo(details) {
    // Basic info
    document.getElementById('crypto-name').textContent = `${details.name} (${details.symbol.toUpperCase()})`;
    document.getElementById('crypto-icon').src = details.image.large;
    
    // Price and change
    const price = formatCurrency(details.market_data.current_price.usd);
    const priceChange = formatPercentage(details.market_data.price_change_percentage_24h);
    const priceChangeClass = details.market_data.price_change_percentage_24h >= 0 ? 'positive' : 'negative';
    
    document.getElementById('crypto-price').textContent = price;
    const changeElement = document.getElementById('crypto-change');
    changeElement.textContent = priceChange;
    changeElement.className = priceChangeClass;
    
    // Market data
    document.getElementById('crypto-market-cap').textContent = formatCurrency(details.market_data.market_cap.usd);
    document.getElementById('crypto-volume').textContent = formatCurrency(details.market_data.total_volume.usd);
    document.getElementById('crypto-supply').textContent = formatNumber(details.market_data.circulating_supply) + ` ${details.symbol.toUpperCase()}`;
    
    // ATH data
    document.getElementById('crypto-ath').textContent = formatCurrency(details.market_data.ath.usd);
    
    const athChange = formatPercentage(details.market_data.ath_change_percentage.usd);
    const athChangeElement = document.getElementById('crypto-ath-change');
    athChangeElement.textContent = athChange;
    athChangeElement.className = details.market_data.ath_change_percentage.usd >= 0 ? 'positive' : 'negative';
    
    const athDate = new Date(details.market_data.ath_date.usd);
    document.getElementById('crypto-ath-date').textContent = athDate.toLocaleDateString();
}

// Update technical analysis
function updateAnalysis(analysis) {
    if (!analysis || analysis.error) {
        console.error('Analysis error:', analysis?.error || 'No analysis data');
        return;
    }
    
    // Moving Averages
    const ma7 = analysis.moving_averages.MA7;
    const ma14 = analysis.moving_averages.MA14;
    const ma30 = analysis.moving_averages.MA30;
    const ma50 = analysis.moving_averages.MA50;
    
    document.getElementById('ma7').textContent = ma7 ? formatCurrency(ma7) : 'N/A';
    document.getElementById('ma14').textContent = ma14 ? formatCurrency(ma14) : 'N/A';
    document.getElementById('ma30').textContent = ma30 ? formatCurrency(ma30) : 'N/A';
    document.getElementById('ma50').textContent = ma50 ? formatCurrency(ma50) : 'N/A';
    
    // Trend
    const trend = analysis.summary.trend;
    const trendElement = document.getElementById('trend-indicator');
    
    let trendIcon, trendClass;
    if (trend.includes('Strong Uptrend')) {
        trendIcon = '<i class="fas fa-arrow-trend-up me-2"></i>';
        trendClass = 'positive';
    } else if (trend.includes('Moderate Uptrend')) {
        trendIcon = '<i class="fas fa-arrow-up me-2"></i>';
        trendClass = 'positive';
    } else if (trend.includes('Strong Downtrend')) {
        trendIcon = '<i class="fas fa-arrow-trend-down me-2"></i>';
        trendClass = 'negative';
    } else {
        trendIcon = '<i class="fas fa-arrow-down me-2"></i>';
        trendClass = 'negative';
    }
    
    trendElement.innerHTML = trendIcon + trend;
    trendElement.className = `d-flex align-items-center ${trendClass}`;
    
    // Volatility
    const volatility = analysis.volatility.overall_volatility_percent;
    document.getElementById('volatility-value').textContent = `${volatility.toFixed(2)}%`;
    
    // Set volatility bar width (scale: 0-15% maps to 0-100%)
    const volatilityPercentage = Math.min(volatility / 15 * 100, 100);
    const volatilityBar = document.getElementById('volatility-bar');
    volatilityBar.style.width = `${volatilityPercentage}%`;
    
    // Set color based on volatility
    if (volatility > 7) {
        volatilityBar.className = 'progress-bar bg-danger';
    } else if (volatility > 3) {
        volatilityBar.className = 'progress-bar bg-warning';
    } else {
        volatilityBar.className = 'progress-bar bg-success';
    }
    
    // Price prediction
    const currentPrice = analysis.price_prediction.current_price;
    const lowerBound = analysis.price_prediction.lower_bound;
    const upperBound = analysis.price_prediction.upper_bound;
    
    document.getElementById('price-current').textContent = formatCurrency(currentPrice);
    document.getElementById('price-low').textContent = formatCurrency(lowerBound);
    document.getElementById('price-high').textContent = formatCurrency(upperBound);
    
    // Performance
    const roc7d = analysis.momentum.roc_7d;
    const roc14d = analysis.momentum.roc_14d;
    const roc30d = analysis.momentum.roc_30d;
    
    updatePerformanceValue('performance-7d', roc7d);
    updatePerformanceValue('performance-14d', roc14d);
    updatePerformanceValue('performance-30d', roc30d);
}

// Update performance display
function updatePerformanceValue(elementId, value) {
    const element = document.getElementById(elementId);
    element.textContent = formatPercentage(value);
    
    if (value > 0) {
        element.className = 'performance-value positive';
    } else if (value < 0) {
        element.className = 'performance-value negative';
    } else {
        element.className = 'performance-value neutral';
    }
}

// Show error message
function showErrorMessage(message) {
    // Could implement a toast or alert here
    console.error(message);
}

// Format currency value
function formatCurrency(value) {
    if (value === undefined || value === null) return 'N/A';
    
    // For very small values (less than $0.01)
    if (value < 0.01) {
        return '$' + value.toFixed(8);
    }
    
    // For small values (less than $1)
    else if (value < 1) {
        return '$' + value.toFixed(4);
    }
    
    // For medium values
    else if (value < 1000) {
        return '$' + value.toFixed(2);
    }
    
    // For larger values, use K, M, B notation
    else if (value < 1000000) {
        return '$' + (value / 1000).toFixed(2) + 'K';
    }
    else if (value < 1000000000) {
        return '$' + (value / 1000000).toFixed(2) + 'M';
    }
    else {
        return '$' + (value / 1000000000).toFixed(2) + 'B';
    }
}

// Format percentage
function formatPercentage(value) {
    if (value === undefined || value === null) return 'N/A';
    
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
}

// Format large numbers
function formatNumber(value) {
    if (value === undefined || value === null) return 'N/A';
    
    if (value >= 1000000000) {
        return (value / 1000000000).toFixed(2) + 'B';
    }
    else if (value >= 1000000) {
        return (value / 1000000).toFixed(2) + 'M';
    }
    else if (value >= 1000) {
        return (value / 1000).toFixed(2) + 'K';
    }
    else {
        return value.toFixed(0);
    }
}
