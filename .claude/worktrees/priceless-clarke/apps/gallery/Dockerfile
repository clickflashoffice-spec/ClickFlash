# ClickFlash Customer Gallery - Production Build
FROM node:20-alpine AS builder
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build Frontend
RUN npm run build

# --- Production Runner ---
FROM node:20-alpine
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Install prod dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy backend and built frontend
COPY backend ./backend
COPY --from=builder /app/dist ./dist

# Create data directory
RUN mkdir -p pb_data/data
ENV DATA_DIR=./pb_data
ENV PORT=8093
ENV NODE_ENV=production

# Expose port
EXPOSE 8093

# Start Backend
CMD ["node", "backend/server.js"]
