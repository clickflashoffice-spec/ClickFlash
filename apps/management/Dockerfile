# ClickFlash Management App - Production Build
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies (cached if package.json doesn't change)
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build Frontend (Vite)
RUN npm run build

# --- Production Runner ---
FROM node:20-alpine

WORKDIR /app

# Install only production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy backend and built frontend
COPY backend ./backend
COPY --from=builder /app/dist ./dist

# Create data directory
RUN mkdir -p pb_data/data
ENV DATA_DIR=./pb_data
ENV PORT=8092
ENV NODE_ENV=production

# Expose port
EXPOSE 8092

# Start Backend
CMD ["node", "backend/server.js"]
