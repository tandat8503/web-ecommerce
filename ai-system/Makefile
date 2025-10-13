# E-commerce AI System Makefile (No OpenAI Required)

.PHONY: help install setup dev build start train api save-api test clean import-shopee train-all deploy

# Default target
help:
	@echo "🚀 AI E-commerce System (No OpenAI Required)"
	@echo "=============================================="
	@echo ""
	@echo "📦 Setup Commands:"
	@echo "  setup          - Complete system setup"
	@echo "  install        - Install dependencies"
	@echo "  import-shopee  - Import Shopee reviews data"
	@echo ""
	@echo "🤖 AI Model Commands:"
	@echo "  train-all      - Train all AI models"
	@echo "  train-sentiment- Train sentiment analysis model"
	@echo "  train-business - Train business analytics model"
	@echo "  setup-chatbot  - Setup chatbot with RAG"
	@echo ""
	@echo "💬 Chatbot Commands:"
	@echo "  chatbot-chat   - Interactive chatbot chat"
	@echo "  chatbot-demo   - Demo chatbot capabilities"
	@echo "  chatbot-api     - Start chatbot API server"
	@echo ""
	@echo "📊 Data & Improvement Commands:"
	@echo "  generate-sample - Generate sample furniture reviews data"
	@echo "  process-crawled- Process crawled data for training"
	@echo "  improve-sentiment- Complete improvement pipeline"
	@echo ""
	@echo "🚀 Massive Data Commands:"
	@echo "  crawl-massive   - Crawl 1000-2000 reviews from multiple sources"
	@echo "  process-massive- Process massive data for training"
	@echo "  improve-massive- Complete massive improvement pipeline"
	@echo ""
	@echo "🚀 Server Commands:"
	@echo "  start          - Start AI System Server"
	@echo "  dev            - Start development server"
	@echo "  prod           - Start production server"
	@echo ""
	@echo "🧪 Testing Commands:"
	@echo "  test           - Run all tests"
	@echo "  test-system    - Test complete system"
	@echo "  sentiment-chat - Interactive sentiment analysis chat"
	@echo "  quick-test     - Quick sentiment test (usage: make quick-test TEXT=\"your text\")"
	@echo ""
	@echo "🧹 Maintenance Commands:"
	@echo "  clean          - Clean build files"
	@echo "  deploy         - Deploy to production"
	@echo ""

# Complete system setup
setup:
	@echo "🚀 Setting up complete AI system..."
	python scripts/setup_ai_system.py
	@echo "✅ System setup completed"

# Install dependencies
install:
	@echo "📦 Installing dependencies..."
	npm install
	pip install -r requirements_core.txt
	pip install -r requirements_sentiment.txt
	pip install -r requirements_business.txt
	pip install -r requirements_chatbot.txt
	pip install -r requirements_api.txt
	pip install -r requirements.txt
	@echo "✅ Dependencies installed"

# Development server (labeling tool)
dev:
	@echo "🚀 Starting development server..."
	npm run dev

# Build production
build:
	@echo "🔨 Building production version..."
	npm run build
	@echo "✅ Build completed"

# Start production server
start:
	@echo "🚀 Starting production server..."
	npm start

# Train all AI models
train-all:
	@echo "🤖 Training all AI models..."
	python scripts/train_sentiment_model.py
	python scripts/train_business_model.py
	python scripts/setup_chatbot.py
	@echo "✅ All models trained"

# Train sentiment analysis model
train-sentiment:
	@echo "📊 Training sentiment analysis model..."
	python scripts/train_sentiment_model.py
	@echo "✅ Sentiment model trained"

# Train Shopee sentiment model (recommended)
train-shopee-sentiment:
	@echo "📊 Training Shopee sentiment model..."
	python scripts/train_shopee_sentiment.py
	@echo "✅ Shopee sentiment model trained"

# Test Shopee sentiment model
test-shopee-sentiment:
	@echo "🧪 Testing Shopee sentiment model..."
	python scripts/test_shopee_sentiment.py
	@echo "✅ Shopee sentiment model tested"

# Train advanced Vietnamese sentiment model
train-advanced-sentiment:
	@echo "🚀 Training advanced Vietnamese sentiment model..."
	python scripts/train_advanced_sentiment.py $(DATA_DIR)
	@echo "✅ Advanced sentiment model trained"

# Generate sample furniture reviews data
generate-sample:
	@echo "📝 Generating sample furniture reviews data..."
	python scripts/generate_sample_data.py
	@echo "✅ Sample data generated"

# Crawl furniture reviews data (manual run)
crawl-reviews:
	@echo "🕷️ Crawling furniture reviews data..."
	@echo "⚠️ Note: This may take time and requires internet connection"
	python scripts/crawl_furniture_reviews.py
	@echo "✅ Reviews crawling completed"

# Process crawled data
process-crawled:
	@echo "🔧 Processing crawled data..."
	python scripts/process_crawled_data.py
	@echo "✅ Crawled data processed"

# Improve sentiment model (crawl + process + train)
improve-sentiment:
	@echo "🚀 Improving sentiment model with new data..."
	python scripts/improve_sentiment_model.py
	@echo "✅ Sentiment model improved"

# Crawl massive reviews data (1000-2000 reviews)
crawl-massive:
	@echo "🕷️ Crawling massive reviews data..."
	@echo "⚠️ Note: This will generate 1000-2000 reviews from multiple sources"
	python scripts/data_crawling/crawl_massive_reviews.py
	@echo "✅ Massive reviews crawling completed"

# Process massive data
process-massive:
	@echo "🔧 Processing massive data..."
	python scripts/data_crawling/process_massive_data.py
	@echo "✅ Massive data processed"

# Improve sentiment model with massive data
improve-massive:
	@echo "🚀 Improving sentiment model with massive data..."
	@echo "Step 1: Crawling massive data..."
	python scripts/data_crawling/crawl_massive_reviews.py
	@echo "Step 2: Processing massive data..."
	python scripts/data_crawling/process_massive_data.py
	@echo "Step 3: Retraining model..."
	python scripts/sentiment/train_advanced_sentiment.py /Users/macbookpro/Workspace/test_repo/shopee-reviews-sentiment-analysis/data
	@echo "✅ Massive sentiment model improved"

# Train business analytics model
train-business:
	@echo "📈 Training business analytics model..."
	python scripts/business_analytics/train_business_model.py
	@echo "✅ Business model trained"

# Setup chatbot with RAG
setup-chatbot:
	@echo "🤖 Setting up chatbot with RAG..."
	python scripts/chatbot/setup_chatbot.py
	@echo "✅ Chatbot setup completed"

# Interactive chatbot chat
chatbot-chat:
	@echo "💬 Starting interactive chatbot..."
	python scripts/chatbot/chatbot_interactive.py

# Demo chatbot capabilities
chatbot-demo:
	@echo "🎯 Demo chatbot capabilities..."
	python scripts/chatbot/chatbot_demo.py

# Production AI Server
start:
	@echo "🚀 Starting AI System Server..."
	python main.py

# Development server
dev:
	@echo "🔧 Starting AI System Server (Development)..."
	python main.py --debug

# Production server
prod:
	@echo "🏭 Starting AI System Server (Production)..."
	python main.py --host 0.0.0.0 --port 5002

# Legacy compatibility
ai-api: start
chatbot-api: start

# Train AI models from labeled data (legacy)
train:
	@echo "🤖 Training AI models from labeled data..."
	python scripts/train_models.py
	@echo "✅ Training completed"

# Start integrated AI API server
api:
	@echo "🚀 Starting integrated AI API server..."
	python scripts/start_api_server.py

# Start Save Labels API server
save-api:
	@echo "🚀 Starting Save Labels API server..."
	python api/save_labels_api.py

# Import Shopee reviews data
import-shopee:
	@echo "📥 Importing Shopee reviews data..."
	python scripts/import_shopee_data.py
	@echo "✅ Shopee data import completed"

# Run all tests
test:
	@echo "🧪 Running all tests..."
	python -m pytest tests/ -v
	python scripts/test_system.py
	@echo "✅ All tests completed"

# Test complete system
test-system:
	@echo "🧪 Testing complete AI system..."
	python scripts/test_system.py
	@echo "✅ System test completed"

# Interactive sentiment analysis chat
sentiment-chat:
	@echo "💬 Starting interactive sentiment analysis chat..."
	python scripts/sentiment_chat.py

# Quick sentiment test
quick-test:
	@echo "⚡ Quick sentiment test..."
	python scripts/quick_sentiment_test.py $(TEXT)

# Deploy to production
deploy:
	@echo "🚀 Deploying to production..."
	@echo "1. Building production version..."
	npm run build
	@echo "2. Training final models..."
	make train-all
	@echo "3. Starting production server..."
	nohup python scripts/start_api_server.py > logs/api.log 2>&1 &
	@echo "✅ Deployment completed"

# Clean build files
clean:
	@echo "🧹 Cleaning build files..."
	rm -rf out/
	rm -rf node_modules/
	rm -rf .next/
	rm -rf models/*.pkl
	@echo "✅ Clean completed"

# Full setup
setup: install
	@echo "🔧 Setting up AI system..."
	mkdir -p models data logs
	cp env.example .env
	@echo "✅ Setup completed"
	@echo "📝 Please edit .env file with your database configuration"
