# Frontend Dockerfile cho Web E-commerce
FROM node:18-alpine AS base

# Cài đặt dependencies cần thiết
RUN apk add --no-cache \
    curl

# Tạo thư mục app
WORKDIR /app

# Copy package files
COPY package*.json ./

# Cài đặt dependencies
RUN npm ci

# Copy source code
COPY . .

# Build frontend
RUN npm run build

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000 || exit 1

# Start frontend server
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "3000"]
