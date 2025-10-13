#!/usr/bin/env python3
"""
Unified AI API - Single endpoint for all AI services
Combines chatbot, sentiment analysis, and business analytics
"""

import os
import sys
import json
import uuid
import time
from datetime import datetime
from pathlib import Path
from flask import Flask, request, jsonify
from flask_cors import CORS

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

# Import AI engine
from core.ai_engine import get_rag_system, UnifiedRAGSystem

app = Flask(__name__)
CORS(app)

# Initialize AI systems
rag_system = None
sentiment_model = None

def init_ai_systems():
    """Initialize all AI systems"""
    global rag_system, sentiment_model
    
    try:
        # Initialize chatbot
        rag_system = get_rag_system()
        
        # Initialize sentiment model (if available)
        try:
            from scripts.sentiment.train_advanced_sentiment import load_sentiment_model
            sentiment_model = load_sentiment_model()
            print("✅ Sentiment model loaded")
        except Exception as e:
            print(f"⚠️ Sentiment model not available: {e}")
        
        print("✅ All AI systems initialized successfully")
        return True
        
    except Exception as e:
        print(f"❌ Error initializing AI systems: {e}")
        return False

# Initialize on startup
init_ai_systems()

@app.route('/api/ai/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "success": True,
        "timestamp": datetime.now().isoformat(),
        "services": {
            "chatbot": rag_system is not None,
            "sentiment": sentiment_model is not None,
            "mysql": rag_system.mysql.connection is not None if rag_system else False
        }
    })

@app.route('/api/ai/chat', methods=['POST'])
def chat():
    """Unified chat endpoint"""
    try:
        data = request.get_json()
        
        if not data or 'message' not in data:
            return jsonify({
                'success': False,
                'error': 'Message is required'
            }), 400
        
        message = data['message'].strip()
        session_id = data.get('session_id', str(uuid.uuid4()))
        
        if not message:
            return jsonify({
                'success': False,
                'error': 'Message cannot be empty'
            }), 400
        
        # Generate response
        result = rag_system.generate_response(message, session_id)
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500

@app.route('/api/ai/sentiment', methods=['POST'])
def analyze_sentiment():
    """Sentiment analysis endpoint"""
    try:
        data = request.get_json()
        
        if not data or 'text' not in data:
            return jsonify({
                'success': False,
                'error': 'Text is required'
            }), 400
        
        text = data['text'].strip()
        
        if not text:
            return jsonify({
                'success': False,
                'error': 'Text cannot be empty'
            }), 400
        
        if sentiment_model is None:
            return jsonify({
                'success': False,
                'error': 'Sentiment model not available'
            }), 503
        
        # Analyze sentiment
        sentiment, confidence = sentiment_model.predict_sentiment(text)
        
        return jsonify({
            'success': True,
            'sentiment': sentiment,
            'confidence': confidence,
            'text': text,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500

@app.route('/api/ai/analytics', methods=['GET'])
def get_analytics():
    """Get system analytics"""
    try:
        analytics = rag_system.get_analytics()
        
        return jsonify({
            'success': True,
            'analytics': analytics,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500

@app.route('/api/ai/sessions/<session_id>', methods=['GET'])
def get_session_history(session_id):
    """Get conversation history for session"""
    try:
        history = rag_system.get_session_history(session_id)
        
        return jsonify({
            'success': True,
            'session_id': session_id,
            'history': history,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500

@app.route('/api/ai/products', methods=['GET'])
def get_products():
    """Get products from database"""
    try:
        limit = request.args.get('limit', 10, type=int)
        products = rag_system.mysql.get_products(limit)
        
        return jsonify({
            'success': True,
            'products': products,
            'count': len(products),
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500

@app.route('/api/ai/search', methods=['POST'])
def search_products():
    """Search products"""
    try:
        data = request.get_json()
        
        if not data or 'query' not in data:
            return jsonify({
                'success': False,
                'error': 'Query is required'
            }), 400
        
        query = data['query'].strip()
        
        if not query:
            return jsonify({
                'success': False,
                'error': 'Query cannot be empty'
            }), 400
        
        products = rag_system.mysql.search_products(query)
        
        return jsonify({
            'success': True,
            'query': query,
            'products': products,
            'count': len(products),
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500

if __name__ == '__main__':
    import logging
    logging.basicConfig(level=logging.INFO)
    
    logger = logging.getLogger(__name__)
    logger.info("🤖 Starting AI System Server")
    logger.info("=" * 50)
    logger.info("✅ AI engine initialized successfully")
    logger.info("🚀 Server starting on http://localhost:5002")
    logger.info("📚 Available endpoints:")
    logger.info("   POST /api/ai/chat - Chat with AI")
    logger.info("   POST /api/ai/sentiment - Analyze sentiment")
    logger.info("   GET  /api/ai/health - Health check")
    logger.info("   GET  /api/ai/analytics - Get analytics")
    logger.info("   GET  /api/ai/sessions/<id> - Get session history")
    logger.info("   GET  /api/ai/products - Get products")
    logger.info("   POST /api/ai/search - Search products")
    logger.info("=" * 50)
    
    app.run(host='0.0.0.0', port=5002, debug=False)
