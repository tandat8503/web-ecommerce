# Web E-commerce Docker Management
.PHONY: help start stop logs clean status

# Default target
help:
	@echo "🚀 Web E-commerce Docker Commands"
	@echo "================================="
	@echo ""
	@echo "📦 Main Commands:"
	@echo "  make start     - Chạy Backend + Frontend (1 lệnh duy nhất)"
	@echo "  make stop      - Dừng tất cả services"
	@echo "  make restart   - Restart services"
	@echo ""
	@echo "📊 Utility Commands:"
	@echo "  make logs      - Xem logs real-time"
	@echo "  make status    - Kiểm tra status"
	@echo "  make clean     - Xóa containers và images"
	@echo "  make shell     - Vào container"
	@echo ""

# Main Commands
start:
	@echo "🚀 Starting Web E-commerce (Backend + Frontend)..."
	@./start.sh

stop:
	@echo "🛑 Stopping all services..."
	@docker-compose down

restart: stop start

# Utility Commands
logs:
	@echo "📋 Showing logs (real-time)..."
	@docker-compose logs -f

status:
	@echo "🔍 Checking services status..."
	@echo ""
	@echo "📊 Container Status:"
	@docker-compose ps
	@echo ""
	@echo "🌐 Health Checks:"
	@echo -n "Backend: "
	@curl -s http://localhost:5000/api/health > /dev/null 2>&1 && echo "✅ OK" || echo "❌ Failed"
	@echo -n "Frontend: "
	@curl -s http://localhost:3000 > /dev/null 2>&1 && echo "✅ OK" || echo "❌ Failed"

clean:
	@echo "🧹 Cleaning containers and images..."
	@docker-compose down
	@docker system prune -f

shell:
	@echo "🐚 Entering container..."
	@docker-compose exec web-ecommerce sh