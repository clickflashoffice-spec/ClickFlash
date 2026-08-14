# ClickFlash Customer Gallery - Production Build
# NOTE: Backend is now a Cloudflare Worker (backend/src/server.ts).
# This Dockerfile builds and serves the static frontend only.
# Deploy the Worker separately with: cd backend && npx wrangler deploy

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

WORKDIR /app

# Install serve for static file hosting
RUN npm install -g serve

# Copy built frontend
COPY --from=builder /app/dist ./dist

ENV PORT=3000
ENV NODE_ENV=production

# Expose port
EXPOSE 3000

# Serve static frontend
CMD ["serve", "-s", "dist", "-l", "3000"]
