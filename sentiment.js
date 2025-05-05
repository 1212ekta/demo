// Sentiment analysis functions for Crypto Analysis Platform

// Initialize sentiment analysis functionality
document.addEventListener('DOMContentLoaded', () => {
    // Check if we're on the sentiment analysis page
    const isSentimentPage = document.getElementById('sentiment-analysis') !== null;
    
    if (isSentimentPage) {
        // Set up event listeners for Reddit sentiment analysis
        const analyzeButton = document.getElementById('analyze-button');
        if (analyzeButton) {
            analyzeButton.addEventListener('click', performSentimentAnalysis);
        }
        
        // Enable pressing Enter key in Reddit search box
        const searchQuery = document.getElementById('search-query');
        if (searchQuery) {
            searchQuery.addEventListener('keypress', (event) => {
                if (event.key === 'Enter') {
                    performSentimentAnalysis();
                }
            });
        }
        
        // Set up event listeners for text sentiment analysis
        const analyzeTextButton = document.getElementById('analyze-text-button');
        if (analyzeTextButton) {
            analyzeTextButton.addEventListener('click', analyzeTextSentiment);
        }
        
        // Enable pressing Enter key in text sentiment textarea
        const sentimentText = document.getElementById('sentiment-text');
        if (sentimentText) {
            sentimentText.addEventListener('keypress', (event) => {
                if (event.key === 'Enter' && event.ctrlKey) {
                    analyzeTextSentiment();
                    event.preventDefault();
                }
            });
        }
    }
});

// Global variables
let sentimentChart = null;

// Analyze text sentiment
function analyzeTextSentiment() {
    const text = document.getElementById('sentiment-text').value.trim();
    
    // Validate text
    if (!text) {
        alert('Please enter text to analyze');
        return;
    }
    
    // Update button state
    const analyzeButton = document.getElementById('analyze-text-button');
    analyzeButton.disabled = true;
    analyzeButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Analyzing...';
    
    // Send request to analyze text
    fetch('/api/text/sentiment', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text: text })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to analyze text sentiment');
        }
        return response.json();
    })
    .then(data => {
        // Update button state
        analyzeButton.disabled = false;
        analyzeButton.innerHTML = '<i class="fas fa-search me-2"></i>Analyze Text Sentiment';
        
        // Update results UI
        updateTextSentimentResults(data);
        
        // Show results section
        document.getElementById('text-sentiment-results').classList.remove('d-none');
    })
    .catch(error => {
        console.error('Error:', error);
        
        // Update button state
        analyzeButton.disabled = false;
        analyzeButton.innerHTML = '<i class="fas fa-search me-2"></i>Analyze Text Sentiment';
        
        // Show error
        alert(`Error analyzing text sentiment: ${error.message}`);
    });
}

// Update text sentiment results in the UI
function updateTextSentimentResults(data) {
    // Update sentiment icon and class
    const sentimentIcon = document.getElementById('text-sentiment-icon');
    const overallSentiment = document.getElementById('text-overall-sentiment');
    
    overallSentiment.textContent = capitalizeFirstLetter(data.sentiment);
    
    if (data.sentiment === 'positive') {
        sentimentIcon.innerHTML = '<i class="fas fa-smile sentiment-positive"></i>';
        overallSentiment.className = 'sentiment-positive';
    } else if (data.sentiment === 'negative') {
        sentimentIcon.innerHTML = '<i class="fas fa-frown sentiment-negative"></i>';
        overallSentiment.className = 'sentiment-negative';
    } else {
        sentimentIcon.innerHTML = '<i class="fas fa-meh sentiment-neutral"></i>';
        overallSentiment.className = 'sentiment-neutral';
    }
    
    // Update score percentages
    document.getElementById('text-positive-score').textContent = Math.round(data.positive * 100) + '%';
    document.getElementById('text-neutral-score').textContent = Math.round(data.neutral * 100) + '%';
    document.getElementById('text-negative-score').textContent = Math.round(data.negative * 100) + '%';
}

// Perform sentiment analysis
function performSentimentAnalysis() {
    const query = document.getElementById('search-query').value.trim();
    const subreddit = document.getElementById('subreddit-select').value;
    const limit = document.getElementById('post-limit').value;
    
    // Validate query
    if (!query) {
        alert('Please enter a search term');
        return;
    }
    
    // Show loading state
    document.getElementById('sentiment-results').classList.add('d-none');
    document.getElementById('no-sentiment-data').classList.add('d-none');
    document.getElementById('api-credentials-missing').classList.add('d-none');
    document.getElementById('loading-spinner').classList.remove('d-none');
    
    // Update analyze button state
    const analyzeButton = document.getElementById('analyze-button');
    analyzeButton.disabled = true;
    analyzeButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Analyzing...';
    
    // Fetch sentiment analysis
    fetch(`/api/reddit/sentiment?query=${encodeURIComponent(query)}&subreddit=${subreddit}&limit=${limit}`)
        .then(response => {
            // First get the json response, even if status is not ok
            return response.json().then(data => {
                // Add status to the data object for checking later
                return { ...data, status: response.status };
            });
        })
        .then(data => {
            // Hide loading spinner
            document.getElementById('loading-spinner').classList.add('d-none');
            
            // Update analyze button state
            analyzeButton.disabled = false;
            analyzeButton.innerHTML = '<i class="fas fa-search me-2"></i>Analyze Sentiment';
            
            // Check if it's a credentials error
            if (data.missing_credentials || data.needs_configuration) {
                // Show API credentials missing message
                const credentialsError = document.getElementById('api-credentials-missing');
                if (credentialsError) {
                    credentialsError.classList.remove('d-none');
                    // If the element doesn't exist yet, we need to create it
                    if (!credentialsError.querySelector('.alert')) {
                        credentialsError.innerHTML = `
                            <div class="alert alert-warning" role="alert">
                                <h4 class="alert-heading"><i class="fas fa-exclamation-triangle me-2"></i>Reddit API Credentials Required</h4>
                                <p>This feature requires Reddit API credentials to access Reddit data.</p>
                                <hr>
                                <p class="mb-0">To use this feature, you need to:</p>
                                <ol>
                                    <li>Register a Reddit app at <a href="https://www.reddit.com/prefs/apps" target="_blank">https://www.reddit.com/prefs/apps</a></li>
                                    <li>Create an application of type "script"</li>
                                    <li>Add the Client ID and Client Secret to your environment variables as REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET</li>
                                </ol>
                            </div>
                        `;
                    }
                }
                return;
            }
            
            // Check for other errors
            if (data.error || data.status >= 400) {
                throw new Error(data.error || 'Failed to perform sentiment analysis');
            }
            
            // Update UI with results
            updateSentimentResults(data);
            
            // Show results section
            document.getElementById('sentiment-results').classList.remove('d-none');
        })
        .catch(error => {
            console.error('Error:', error);
            
            // Hide loading spinner
            document.getElementById('loading-spinner').classList.add('d-none');
            
            // Update analyze button state
            analyzeButton.disabled = false;
            analyzeButton.innerHTML = '<i class="fas fa-search me-2"></i>Analyze Sentiment';
            
            // Show error
            document.getElementById('no-sentiment-data').classList.remove('d-none');
            alert(`Error performing sentiment analysis: ${error.message}`);
        });
}

// Update sentiment results in the UI
function updateSentimentResults(data) {
    // Update overall sentiment
    const overallSentiment = document.getElementById('overall-sentiment');
    const sentimentIcon = document.getElementById('sentiment-icon');
    
    overallSentiment.textContent = capitalizeFirstLetter(data.overall_sentiment);
    
    // Update sentiment icon
    if (data.overall_sentiment === 'positive') {
        sentimentIcon.innerHTML = '<i class="fas fa-smile sentiment-positive"></i>';
        overallSentiment.className = 'sentiment-positive';
    } else if (data.overall_sentiment === 'negative') {
        sentimentIcon.innerHTML = '<i class="fas fa-frown sentiment-negative"></i>';
        overallSentiment.className = 'sentiment-negative';
    } else {
        sentimentIcon.innerHTML = '<i class="fas fa-meh sentiment-neutral"></i>';
        overallSentiment.className = 'sentiment-neutral';
    }
    
    // Update posts analyzed
    document.getElementById('posts-analyzed').textContent = `Based on ${data.posts_analyzed} posts`;
    
    // Create sentiment distribution chart
    createSentimentChart(data.sentiment_distribution);
    
    // Update posts table
    updateSentimentTable(data.posts_details);
}

// Create sentiment distribution chart
function createSentimentChart(distribution) {
    const ctx = document.getElementById('sentiment-chart').getContext('2d');
    
    // Prepare data
    const labels = Object.keys(distribution).map(capitalizeFirstLetter);
    const data = Object.values(distribution).map(value => value * 100);
    
    // Destroy existing chart if it exists
    if (sentimentChart) {
        sentimentChart.destroy();
    }
    
    // Colors for the chart
    const backgroundColors = [
        'rgba(46, 204, 113, 0.6)',  // Positive - Green
        'rgba(241, 196, 15, 0.6)',  // Neutral - Yellow
        'rgba(231, 76, 60, 0.6)'    // Negative - Red
    ];
    
    const borderColors = [
        '#2ecc71',  // Positive
        '#f1c40f',  // Neutral
        '#e74c3c'   // Negative
    ];
    
    // Create the chart
    sentimentChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [
                {
                    data: data,
                    backgroundColor: backgroundColors,
                    borderColor: borderColors,
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.parsed;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((value / total) * 100);
                            return `${context.label}: ${percentage}%`;
                        }
                    }
                },
                legend: {
                    position: 'right',
                    labels: {
                        color: 'rgba(255, 255, 255, 0.7)'
                    }
                }
            }
        }
    });
}

// Update sentiment table with posts
function updateSentimentTable(posts) {
    const tableBody = document.querySelector('#sentiment-table tbody');
    tableBody.innerHTML = ''; // Clear existing rows
    
    // Sort posts by sentiment compound score (most positive first)
    const sortedPosts = [...posts].sort((a, b) => 
        b.sentiment.compound - a.sentiment.compound
    );
    
    // Add rows for each post (limit to top 10)
    const postsToShow = sortedPosts.slice(0, 10);
    
    postsToShow.forEach(post => {
        const row = document.createElement('tr');
        
        // Title cell
        const titleCell = document.createElement('td');
        titleCell.textContent = post.title;
        
        // Score cell
        const scoreCell = document.createElement('td');
        scoreCell.textContent = post.score;
        
        // Comments cell
        const commentsCell = document.createElement('td');
        commentsCell.textContent = post.num_comments;
        
        // Sentiment cell
        const sentimentCell = document.createElement('td');
        const sentimentValue = post.sentiment.sentiment;
        
        let sentimentClass;
        if (sentimentValue === 'positive') {
            sentimentClass = 'sentiment-positive';
        } else if (sentimentValue === 'negative') {
            sentimentClass = 'sentiment-negative';
        } else {
            sentimentClass = 'sentiment-neutral';
        }
        
        sentimentCell.innerHTML = `
            <span class="${sentimentClass}">
                ${capitalizeFirstLetter(sentimentValue)}
                (${(post.sentiment.compound * 100).toFixed(0)})
            </span>
        `;
        
        // Append cells to row
        row.appendChild(titleCell);
        row.appendChild(scoreCell);
        row.appendChild(commentsCell);
        row.appendChild(sentimentCell);
        
        // Append row to table
        tableBody.appendChild(row);
    });
    
    // If no posts, show message
    if (postsToShow.length === 0) {
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.colSpan = 4;
        cell.textContent = 'No posts found';
        cell.className = 'text-center';
        row.appendChild(cell);
        tableBody.appendChild(row);
    }
}

// Helper function to capitalize first letter
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}
