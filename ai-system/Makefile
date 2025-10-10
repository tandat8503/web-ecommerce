# AI System Makefile
# Chức năng: Quản lý toàn bộ hệ thống AI cho e-commerce

.PHONY: install train agents-api agents-test nlp-api nlp-test web-api web-test clean lint fmt help

# Default target
help:
	@echo "🤖 AI System Commands"
	@echo "====================="
	@echo "install     - Cài đặt tất cả dependencies"
	@echo "train       - Train AI models"
	@echo "agents-api  - Chạy Agents API server"
	@echo "agents-test - Test Agents system"
	@echo "nlp-api     - Chạy NLP API server"
	@echo "nlp-test    - Test NLP system"
	@echo "web-api     - Chạy Web API server"
	@echo "web-test    - Test Web system"
	@echo "all-apis    - Chạy tất cả API servers"
	@echo "all-tests   - Chạy tất cả tests"
	@echo "clean       - Dọn dẹp files tạm"
	@echo "lint        - Kiểm tra code style"
	@echo "fmt         - Format code"
	@echo "help        - Hiển thị help này"

# Install all dependencies
install:
	@echo "📦 Installing all dependencies..."
	pip install -r requirements.txt
	@echo "✅ Dependencies installed"

# Train AI models
train:
	@echo "🚀 Training AI models..."
	python scripts/train_models.py
	@echo "✅ Training completed"

# Agents API
agents-api:
	@echo "🤖 Starting Agents API server..."
	cd agents && make api

agents-test:
	@echo "🧪 Testing Agents system..."
	cd agents && make test

# NLP API
nlp-api:
	@echo "🧠 Starting NLP API server..."
	cd nlp_system && make api

nlp-test:
	@echo "🧪 Testing NLP system..."
	cd nlp_system && make test

# Web API
web-api:
	@echo "🌐 Starting Web API server..."
	cd web && python app.py

web-test:
	@echo "🧪 Testing Web system..."
	cd web && python -c "import app; print('Web app OK')"

# Run all APIs
all-apis:
	@echo "🚀 Starting all API servers..."
	@echo "Starting Agents API on port 5003..."
	cd agents && nohup make api-bg > ../logs/agents_api.log 2>&1 &
	@echo "Starting NLP API on port 5004..."
	cd nlp_system && nohup make api-bg > ../logs/nlp_api.log 2>&1 &
	@echo "Starting Web API on port 5005..."
	cd web && nohup python app.py > ../logs/web_api.log 2>&1 &
	@echo "✅ All APIs started"
	@echo "📋 Check logs:"
	@echo "  - Agents: tail -f logs/agents_api.log"
	@echo "  - NLP: tail -f logs/nlp_api.log"
	@echo "  - Web: tail -f logs/web_api.log"

# Run all tests
all-tests:
	@echo "🧪 Running all tests..."
	$(MAKE) agents-test
	$(MAKE) nlp-test
	$(MAKE) web-test
	@echo "✅ All tests completed"

# Clean temporary files
clean:
	@echo "🧹 Cleaning temporary files..."
	find . -name "*.pyc" -delete
	find . -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null || true
	find . -name "*.log" -delete
	rm -rf logs/*.log
	@echo "✅ Cleaned up"

# Lint code
lint:
	@echo "🔍 Linting code..."
	@if command -v flake8 >/dev/null 2>&1; then \
		find . -name "*.py" -not -path "./venv/*" -not -path "./.venv/*" | xargs flake8; \
	else \
		echo "⚠️ flake8 not installed, skipping linting"; \
	fi

# Format code
fmt:
	@echo "🎨 Formatting code..."
	@if command -v black >/dev/null 2>&1; then \
		find . -name "*.py" -not -path "./venv/*" -not -path "./.venv/*" | xargs black; \
	else \
		echo "⚠️ black not installed, skipping formatting"; \
	fi

# Stop all background processes
stop:
	@echo "🛑 Stopping all background processes..."
	pkill -f "agent_api.py" || true
	pkill -f "nlp_api.py" || true
	pkill -f "web/app.py" || true
	@echo "✅ Stopped all processes"

# Status check
status:
	@echo "📊 AI System Status"
	@echo "==================="
	@echo "Agents API:"
	@curl -s http://localhost:5003/health >/dev/null && echo "  ✅ Running" || echo "  ❌ Not running"
	@echo "NLP API:"
	@curl -s http://localhost:5004/health >/dev/null && echo "  ✅ Running" || echo "  ❌ Not running"
	@echo "Web API:"
	@curl -s http://localhost:5005/health >/dev/null && echo "  ✅ Running" || echo "  ❌ Not running"

# Development setup
dev-setup: install
	@echo "🛠️ Setting up development environment..."
	mkdir -p logs
	touch logs/agents_api.log logs/nlp_api.log logs/web_api.log
	@echo "✅ Development setup completed"

# Production setup
prod-setup: install
	@echo "🏭 Setting up production environment..."
	mkdir -p logs
	@echo "✅ Production setup completed"

