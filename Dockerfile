# Main Dockerfile - Sử dụng docker-compose để chạy riêng biệt
# File này được giữ lại để tương thích ngược
FROM node:18-alpine

# Cài đặt dependencies cần thiết
RUN apk add --no-cache \
    mysql-client \
    openssl \
    netcat-openbsd \
    curl

# Tạo thư mục app
WORKDIR /app

# Copy package files
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# Cài đặt dependencies
RUN cd backend && npm ci --only=production --legacy-peer-deps
RUN cd frontend && npm ci

# Build frontend
COPY frontend/ ./frontend/
RUN cd frontend && npm run build

# Copy backend source
COPY backend/ ./backend/

# Tạo thư mục cho logs
RUN mkdir -p /app/logs

# Expose ports
EXPOSE 3000 5000

# Tạo script khởi động
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo 'echo "🚀 Starting Web E-commerce Application..."' >> /app/start.sh && \
    echo 'echo "📦 Backend: Node.js + Express + Prisma + MySQL"' >> /app/start.sh && \
    echo 'echo "🎨 Frontend: React + Vite + TailwindCSS"' >> /app/start.sh && \
    echo 'echo ""' >> /app/start.sh && \
    echo 'echo "⏳ Waiting for XAMPP MySQL to be ready..."' >> /app/start.sh && \
    echo 'while ! nc -z host.docker.internal 3306; do' >> /app/start.sh && \
    echo '  echo "Waiting for XAMPP MySQL..."' >> /app/start.sh && \
    echo '  sleep 2' >> /app/start.sh && \
    echo 'done' >> /app/start.sh && \
    echo 'echo "✅ XAMPP MySQL is ready!"' >> /app/start.sh && \
    echo 'echo "🔄 Running Prisma migrations..."' >> /app/start.sh && \
    echo 'cd backend && npx prisma migrate deploy' >> /app/start.sh && \
    echo 'echo "🌱 Seeding database..."' >> /app/start.sh && \
    echo 'cd backend && npm run seed' >> /app/start.sh && \
    echo 'echo "🔧 Starting Backend Server..."' >> /app/start.sh && \
    echo 'cd backend && npm start &' >> /app/start.sh && \
    echo 'BACKEND_PID=$!' >> /app/start.sh && \
    echo 'echo "🎨 Starting Frontend Server..."' >> /app/start.sh && \
    echo 'cd frontend && npm run preview -- --host 0.0.0.0 --port 3000 &' >> /app/start.sh && \
    echo 'FRONTEND_PID=$!' >> /app/start.sh && \
    echo 'wait $BACKEND_PID $FRONTEND_PID' >> /app/start.sh && \
    chmod +x /app/start.sh

CMD ["/app/start.sh"]
