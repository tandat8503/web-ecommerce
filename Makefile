# Makefile cho Web E-commerce Project
# Sử dụng với XAMPP MySQL

.PHONY: help build up down logs clean restart status

# Màu sắc cho output
GREEN=\033[0;32m
YELLOW=\033[1;33m
RED=\033[0;31m
NC=\033[0m # No Color

help: ## Hiển thị danh sách các lệnh có sẵn
	@echo "$(GREEN)Web E-commerce Project - Docker Commands$(NC)"
	@echo "=============================================="
	@echo ""
	@echo "$(YELLOW)Database Setup:$(NC)"
	@echo "  make db-setup     - Tạo database và chạy migrations"
	@echo ""
	@echo "$(YELLOW)Docker Commands:$(NC)"
	@echo "  make build        - Build tất cả Docker images"
	@echo "  make up           - Khởi động tất cả services"
	@echo "  make down         - Dừng tất cả services"
	@echo "  make restart      - Restart tất cả services"
	@echo "  make logs         - Xem logs của tất cả services"
	@echo "  make status       - Kiểm tra trạng thái services"
	@echo ""
	@echo "$(YELLOW)Individual Services:$(NC)"
	@echo "  make backend      - Chỉ chạy backend"
	@echo "  make frontend     - Chỉ chạy frontend"
	@echo ""
	@echo "$(YELLOW)Cleanup:$(NC)"
	@echo "  make clean        - Xóa tất cả containers và images"
	@echo "  make clean-all    - Xóa tất cả containers, images và volumes"
	@echo ""
	@echo "$(RED)Lưu ý: Đảm bảo XAMPP MySQL đang chạy trước khi sử dụng!$(NC)"

# Database setup
db-setup: ## Tạo database và chạy migrations
	@echo "$(GREEN)🔧 Setting up database...$(NC)"
	@echo "Đảm bảo XAMPP MySQL đang chạy trên port 3306"
	@echo "Tạo database 'ecommerce_db' trong phpMyAdmin"
	@echo "Sau đó chạy: make up"

# Docker commands
build: ## Build tất cả Docker images
	@echo "$(GREEN)🔨 Building Docker images...$(NC)"
	docker-compose build

up: ## Khởi động tất cả services
	@echo "$(GREEN)🚀 Starting Web E-commerce services...$(NC)"
	@echo "$(YELLOW)Đảm bảo XAMPP MySQL đang chạy!$(NC)"
	docker-compose up -d
	@echo "$(GREEN)✅ Services started!$(NC)"
	@echo "Frontend: http://localhost:3000"
	@echo "Backend API: http://localhost:5000"

down: ## Dừng tất cả services
	@echo "$(YELLOW)🛑 Stopping services...$(NC)"
	docker-compose down

restart: ## Restart tất cả services
	@echo "$(YELLOW)🔄 Restarting services...$(NC)"
	docker-compose restart

logs: ## Xem logs của tất cả services
	docker-compose logs -f

status: ## Kiểm tra trạng thái services
	@echo "$(GREEN)📊 Service Status:$(NC)"
	docker-compose ps

# Individual services
backend: ## Chỉ chạy backend
	@echo "$(GREEN)🔧 Starting backend only...$(NC)"
	docker-compose up -d backend db-wait

frontend: ## Chỉ chạy frontend
	@echo "$(GREEN)🎨 Starting frontend only...$(NC)"
	docker-compose up -d frontend

# Cleanup
clean: ## Xóa containers và images
	@echo "$(RED)🧹 Cleaning up containers and images...$(NC)"
	docker-compose down --rmi all

clean-all: ## Xóa tất cả containers, images và volumes
	@echo "$(RED)🧹 Cleaning up everything...$(NC)"
	docker-compose down --rmi all --volumes --remove-orphans
	docker system prune -f

# Development helpers
dev-logs: ## Xem logs development
	docker-compose logs -f backend frontend

backend-logs: ## Xem logs backend
	docker-compose logs -f backend

frontend-logs: ## Xem logs frontend
	docker-compose logs -f frontend

# Database helpers
db-migrate: ## Chạy Prisma migrations
	@echo "$(GREEN)🔄 Running Prisma migrations...$(NC)"
	docker-compose exec backend npx prisma migrate deploy

db-seed: ## Chạy database seeding
	@echo "$(GREEN)🌱 Seeding database...$(NC)"
	docker-compose exec backend npm run seed

db-reset: ## Reset database (cẩn thận!)
	@echo "$(RED)⚠️  Resetting database...$(NC)"
	docker-compose exec backend npx prisma migrate reset --force
