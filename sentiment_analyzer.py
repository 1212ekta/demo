import nltk
import logging
from nltk.sentiment.vader import SentimentIntensityAnalyzer
from collections import Counter

logger = logging.getLogger(__name__)

class SentimentAnalyzer:
    """Service for performing sentiment analysis on text content"""
    
    def __init__(self):
        # Download NLTK resources if not already downloaded
        try:
            nltk.data.find('sentiment/vader_lexicon.zip')
        except LookupError:
            nltk.download('vader_lexicon')
        
        # Initialize VADER sentiment analyzer
        self.analyzer = SentimentIntensityAnalyzer()
    
    def analyze_text(self, text):
        """
        Analyze sentiment of a single text
        
        Args:
            text (str): Text to analyze
            
        Returns:
            dict: Sentiment scores and classification
        """
        if not text or text.strip() == "":
            return {
                "compound": 0,
                "positive": 0,
                "neutral": 0,
                "negative": 0,
                "sentiment": "neutral"
            }
        
        # Get sentiment scores
        scores = self.analyzer.polarity_scores(text)
        
        # Determine sentiment classification
        compound = scores['compound']
        if compound >= 0.05:
            sentiment = "positive"
        elif compound <= -0.05:
            sentiment = "negative"
        else:
            sentiment = "neutral"
            
        return {
            "compound": scores['compound'],
            "positive": scores['pos'],
            "neutral": scores['neu'],
            "negative": scores['neg'],
            "sentiment": sentiment
        }
    
    def analyze_posts(self, posts):
        """
        Analyze sentiment of multiple Reddit posts
        
        Args:
            posts (list): List of post dictionaries
            
        Returns:
            dict: Aggregated sentiment analysis results
        """
        if not posts:
            return {
                "overall_sentiment": "neutral",
                "average_scores": {
                    "compound": 0,
                    "positive": 0,
                    "neutral": 0,
                    "negative": 0
                },
                "sentiment_distribution": {
                    "positive": 0,
                    "neutral": 0,
                    "negative": 0
                },
                "posts_analyzed": 0,
                "posts_details": []
            }
            
        total_scores = {
            "compound": 0,
            "positive": 0,
            "neutral": 0,
            "negative": 0
        }
        
        sentiment_counts = Counter()
        posts_details = []
        
        # Analyze each post
        for post in posts:
            # Combine title and text for analysis
            full_text = f"{post['title']} {post.get('selftext', '')}"
            
            # Analyze sentiment
            sentiment_result = self.analyze_text(full_text)
            
            # Update totals
            for key in total_scores:
                total_scores[key] += sentiment_result[key]
                
            sentiment_counts[sentiment_result['sentiment']] += 1
            
            # Add sentiment analysis to post details
            post_detail = {
                'id': post['id'],
                'title': post['title'],
                'score': post['score'],
                'num_comments': post['num_comments'],
                'sentiment': sentiment_result
            }
            posts_details.append(post_detail)
        
        # Calculate averages
        post_count = len(posts)
        average_scores = {
            key: value / post_count for key, value in total_scores.items()
        }
        
        # Determine overall sentiment
        if average_scores['compound'] >= 0.05:
            overall_sentiment = "positive"
        elif average_scores['compound'] <= -0.05:
            overall_sentiment = "negative"
        else:
            overall_sentiment = "neutral"
            
        # Prepare sentiment distribution
        sentiment_distribution = {
            sentiment: count / post_count for sentiment, count in sentiment_counts.items()
        }
        
        # Ensure all sentiments are present
        for sentiment in ['positive', 'neutral', 'negative']:
            if sentiment not in sentiment_distribution:
                sentiment_distribution[sentiment] = 0
        
        # Return aggregated results
        return {
            "overall_sentiment": overall_sentiment,
            "average_scores": average_scores,
            "sentiment_distribution": sentiment_distribution,
            "posts_analyzed": post_count,
            "posts_details": posts_details
        }
