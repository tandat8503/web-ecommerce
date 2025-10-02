# Backend Dockerfile cho Web E-commerce
FROM node:18-alpine AS base

# Cài đặt dependencies cần thiết
RUN apk add --no-cache \
    mysql-client \
    openssl \
    netcat-openbsd \
    curl

# Tạo thư mục app
WORKDIR /app

# Copy package files
COPY package*.json ./

# Cài đặt dependencies
RUN npm ci --only=production --legacy-peer-deps

# Copy source code
COPY . .

# Tạo thư mục logs
RUN mkdir -p /app/logs

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/api/health || exit 1

# Tạo script khởi động
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo 'echo "🚀 Starting Web E-commerce Backend..."' >> /app/start.sh && \
    echo 'echo "📦 Backend: Node.js + Express + Prisma + MySQL"' >> /app/start.sh && \
    echo 'echo ""' >> /app/start.sh && \
    echo 'echo "⏳ Waiting for XAMPP MySQL to be ready..."' >> /app/start.sh && \
    echo 'while ! nc -z host.docker.internal 3306; do' >> /app/start.sh && \
    echo '  echo "Waiting for XAMPP MySQL..."' >> /app/start.sh && \
    echo '  sleep 2' >> /app/start.sh && \
    echo 'done' >> /app/start.sh && \
    echo 'echo "✅ XAMPP MySQL is ready!"' >> /app/start.sh && \
    echo 'echo "🔄 Running Prisma migrations..."' >> /app/start.sh && \
    echo 'npx prisma migrate deploy' >> /app/start.sh && \
    echo 'echo "🌱 Seeding database..."' >> /app/start.sh && \
    echo 'npm run seed' >> /app/start.sh && \
    echo 'echo "🔧 Starting Backend Server..."' >> /app/start.sh && \
    echo 'npm start' >> /app/start.sh && \
    chmod +x /app/start.sh

CMD ["/app/start.sh"]
