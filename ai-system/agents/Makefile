# Agent System Makefile
# Chức năng: Quản lý các lệnh cho hệ thống agents

.PHONY: install test api api-bg clean help

# Default target
help:
	@echo "🤖 Agent System Commands"
	@echo "========================"
	@echo "install    - Cài đặt dependencies"
	@echo "test       - Chạy tests"
	@echo "api        - Chạy API server"
	@echo "api-bg     - Chạy API server trong background"
	@echo "clean      - Dọn dẹp files tạm"
	@echo "help       - Hiển thị help này"

# Install dependencies
install:
	@echo "📦 Installing dependencies..."
	pip install flask flask-cors

# Run tests
test:
	@echo "🧪 Testing Agent system..."
	python ecommerce_agents.py
	python prompt_manager.py
	python agent_orchestrator.py

# Run API server
api:
	@echo "🚀 Starting Agent API server..."
	python agent_api.py --host 0.0.0.0 --port 5003

# Run API server in background
api-bg:
	@echo "🚀 Starting Agent API server in background..."
	nohup python agent_api.py --host 0.0.0.0 --port 5003 > logs/agent_api.log 2>&1 &
	@echo "✅ Agent API server started in background"
	@echo "📋 Check logs: tail -f logs/agent_api.log"
	@echo "🔗 API URL: http://localhost:5003"

# Clean temporary files
clean:
	@echo "🧹 Cleaning temporary files..."
	find . -name "*.pyc" -delete
	find . -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null || true
	rm -f logs/agent_api.log
	@echo "✅ Cleaned up"

# Stop background processes
stop:
	@echo "🛑 Stopping background processes..."
	pkill -f "agent_api.py" || true
	@echo "✅ Stopped background processes"

