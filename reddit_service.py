import os
import requests
import time
import logging
from datetime import datetime, timedelta
from urllib.parse import quote_plus

logger = logging.getLogger(__name__)

class RedditService:
    """Service for interacting with the Reddit API"""
    
    def __init__(self):
        # Reddit API credentials
        self.client_id = os.environ.get("REDDIT_CLIENT_ID")
        self.client_secret = os.environ.get("REDDIT_CLIENT_SECRET")
        self.user_agent = "CryptoAnalysisPlatform/1.0.0"
        
        # Access token management
        self.access_token = None
        self.token_expiry = datetime.now()
        
        # Base URLs
        self.auth_url = "https://www.reddit.com/api/v1/access_token"
        self.api_base_url = "https://oauth.reddit.com"
    
    def _get_access_token(self):
        """Get or refresh the Reddit API access token"""
        # Check if token is still valid
        if self.access_token and datetime.now() < self.token_expiry:
            return self.access_token
        
        # Request new token
        auth = requests.auth.HTTPBasicAuth(self.client_id, self.client_secret)
        data = {
            'grant_type': 'client_credentials',
            'duration': 'temporary'
        }
        headers = {
            'User-Agent': self.user_agent
        }
        
        try:
            response = requests.post(self.auth_url, auth=auth, data=data, headers=headers)
            response.raise_for_status()
            token_data = response.json()
            
            self.access_token = token_data['access_token']
            # Set token expiry time (subtract 60 seconds for safety)
            self.token_expiry = datetime.now() + timedelta(seconds=token_data['expires_in'] - 60)
            
            return self.access_token
        except requests.exceptions.RequestException as e:
            logger.error(f"Error obtaining Reddit access token: {str(e)}")
            # If we can't get a token and don't have a valid one, raise an exception
            if not self.access_token:
                raise Exception(f"Failed to authenticate with Reddit API: {str(e)}")
            return self.access_token
    
    def _make_request(self, endpoint, params=None):
        """Make a request to the Reddit API"""
        token = self._get_access_token()
        
        headers = {
            'Authorization': f'Bearer {token}',
            'User-Agent': self.user_agent
        }
        
        url = f"{self.api_base_url}/{endpoint}"
        
        try:
            response = requests.get(url, headers=headers, params=params)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.error(f"Error making request to Reddit API: {str(e)}")
            # Check if it's an auth error, if so, invalidate token to force refresh on next call
            if response.status_code == 401:
                self.access_token = None
                self.token_expiry = datetime.now()
            raise Exception(f"Failed to fetch data from Reddit: {str(e)}")
    
    def get_posts(self, subreddit, query, limit=100):
        """
        Get posts from a subreddit that match a search query
        
        Args:
            subreddit (str): Subreddit name (without r/)
            query (str): Search query
            limit (int): Maximum number of posts to return
        
        Returns:
            list: List of post dictionaries
        """
        # Check if API credentials are available
        if not self.client_id or not self.client_secret:
            raise Exception("Reddit API credentials are missing. Please set REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET environment variables.")
            
        # Make sure we don't exceed Reddit's API limits
        if limit > 100:
            limit = 100
            
        # URL encode the query
        encoded_query = quote_plus(query)
        
        # Use the search endpoint to find posts
        endpoint = f"r/{subreddit}/search"
        
        params = {
            'q': query,
            'sort': 'relevance',
            'restrict_sr': 'on',  # Restrict to this subreddit
            't': 'month',  # Time period: hour, day, week, month, year, all
            'limit': limit
        }
        
        try:
            response = self._make_request(endpoint, params)
            
            # Process the response to extract useful data
            posts = []
            
            if 'data' in response and 'children' in response['data']:
                for post_data in response['data']['children']:
                    post = post_data['data']
                    
                    # Extract relevant post information
                    posts.append({
                        'id': post['id'],
                        'title': post['title'],
                        'selftext': post.get('selftext', ''),
                        'score': post['score'],
                        'num_comments': post['num_comments'],
                        'created_utc': post['created_utc'],
                        'url': post['url'],
                        'permalink': f"https://reddit.com{post['permalink']}"
                    })
            
            return posts
        except Exception as e:
            logger.error(f"Error fetching Reddit posts: {str(e)}")
            raise Exception(f"Failed to fetch posts from Reddit: {str(e)}")
