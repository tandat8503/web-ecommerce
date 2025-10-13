# AI System - Unified Architecture

## 🏗️ Structure Overview

```
ai-system/
├── core/                          # Core AI modules
│   ├── unified_chatbot.py        # Main chatbot with MySQL integration
│   ├── ai_database.py            # SQLite database for AI data
│   └── data_manager.py           # Data management utilities
├── api/                          # API endpoints
│   ├── unified_api.py            # Single API for all AI services
│   └── chatbot_api.py            # Legacy chatbot API (deprecated)
├── scripts/                      # Training and utility scripts
│   ├── chatbot/                  # Chatbot-related scripts
│   ├── sentiment/                # Sentiment analysis scripts
│   ├── data_crawling/            # Data collection scripts
│   ├── business_analytics/       # Business analytics scripts
│   └── utils/                    # Utility scripts
├── models/                       # Trained models
│   └── sentiment/                # Sentiment analysis models
├── data/                         # Data storage
│   └── sentiment_training.db    # SQLite database
└── requirements.txt              # Dependencies
```

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd ai-system
pip install -r requirements.txt
```

### 2. Configure Environment
```bash
# Copy environment template
cp env.example .env

# Edit configuration (optional)
nano .env
```

### 3. Start AI System Server
```bash
# Development mode
make dev

# Production mode
make prod

# Or directly
python main.py
```

### 3. Test API Endpoints
```bash
# Health check
curl http://localhost:5002/api/ai/health

# Chat with AI
curl -X POST http://localhost:5002/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Xin chào"}'

# Analyze sentiment
curl -X POST http://localhost:5002/api/ai/sentiment \
  -H "Content-Type: application/json" \
  -d '{"text": "Sản phẩm rất tốt"}'
```

## 📚 API Endpoints

### Core Endpoints
- `POST /api/ai/chat` - Chat with AI chatbot
- `POST /api/ai/sentiment` - Analyze text sentiment
- `GET /api/ai/health` - Health check
- `GET /api/ai/analytics` - System analytics

### Product Management
- `GET /api/ai/products` - Get products from database
- `POST /api/ai/search` - Search products

### Session Management
- `GET /api/ai/sessions/<id>` - Get conversation history

## 🔧 Core Components

### UnifiedRAGSystem
Main chatbot system with:
- MySQL integration for real-time product data
- SQLite knowledge base
- Conversation memory
- Analytics and monitoring
- Error handling and fallbacks

### MySQLConnector
Database connector with:
- Connection pooling
- Caching (5-minute TTL)
- Product search and listing
- Price range queries

### AdvancedLLM
Intelligent response generator with:
- Context-aware responses
- Product validation
- Service information
- Fallback mechanisms

## 🎯 Features

### ✅ Implemented
- **Unified API**: Single endpoint for all AI services
- **MySQL Integration**: Real-time product data from e-commerce database
- **Sentiment Analysis**: Vietnamese text sentiment classification
- **Caching**: Performance optimization with intelligent caching
- **Analytics**: Real-time performance monitoring
- **Error Handling**: Graceful degradation and fallbacks
- **Session Management**: Conversation history tracking

### 🚧 Planned
- **Vector Search**: FAISS/ChromaDB integration for semantic search
- **Business Analytics**: Sales forecasting and trend analysis
- **Multi-language**: Support for English and other languages
- **Voice Interface**: Speech-to-text and text-to-speech

## 📊 Performance

### Response Times
- Chat responses: < 200ms average
- Sentiment analysis: < 100ms average
- Product search: < 150ms average

### Scalability
- Connection pooling: 5 concurrent connections
- Cache TTL: 5 minutes
- Session memory: 10 messages per session
- Analytics buffer: 1000 recent metrics

## 🔒 Security

### Data Protection
- SQL injection prevention
- Input validation and sanitization
- Error message sanitization
- Session isolation

### API Security
- CORS enabled for frontend integration
- Request timeout: 10 seconds
- Error logging without sensitive data

## 🧪 Testing

### Manual Testing
```bash
# Test chatbot
make chatbot-chat

# Test sentiment
make sentiment-chat

# Test API
curl -X POST http://localhost:5002/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Có những sản phẩm gì?"}'
```

### Automated Testing
```bash
# Run tests (when implemented)
python -m pytest tests/
```

## 📈 Monitoring

### Analytics Dashboard
- Real-time response times
- Error rates
- Active sessions
- MySQL connection status
- Knowledge base size

### Logs
- Structured logging with timestamps
- Error tracking and debugging
- Performance metrics
- User interaction patterns

## 🔄 Migration Guide

### From Old Structure
1. Update frontend API calls to use `/api/ai/*` endpoints
2. Replace `chatbotAPI` with `aiAPI` in frontend
3. Update Makefile commands to use `make ai-api`
4. Remove old script dependencies

### Backward Compatibility
- Old `/api/chatbot/*` endpoints still work
- `chatbotAPI` is aliased to `aiAPI`
- Legacy scripts remain functional

## 🛠️ Development

### Adding New Features
1. Extend `UnifiedRAGSystem` class
2. Add new endpoints to `unified_api.py`
3. Update frontend `aiAPI.js`
4. Add tests and documentation

### Debugging
```bash
# Enable debug mode
export FLASK_DEBUG=1
python api/unified_api.py

# Check logs
tail -f logs/ai_system.log
```

## 📝 License

This AI system is part of the web-ecommerce project and follows the same license terms.
