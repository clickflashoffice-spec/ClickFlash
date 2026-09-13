# ClickFlash Root Dockerfile
# Used for CI/CD builds

FROM node:22-alpine AS base

# Install dependencies
RUN apk add --no-cache python3 make g++ git

WORKDIR /app

# Add pnpm installation
RUN corepack enable && corepack prepare pnpm@10.28.2 --activate

# Copy package files
COPY package*.json ./
COPY pnpm-lock.yaml ./
COPY pnpm-workspace.yaml ./
COPY .npmrc ./
COPY apps/backend/ai-worker/package*.json ./apps/backend/ai-worker/
COPY apps/backend/cloud-backend/package*.json ./apps/backend/cloud-backend/
COPY apps/backend/mcp-server/package*.json ./apps/backend/mcp-server/
COPY apps/backend/ride-node/package*.json ./apps/backend/ride-node/
COPY apps/cinematic-preview/package*.json ./apps/cinematic-preview/
COPY apps/desktop/installer/package*.json ./apps/desktop/installer/
COPY apps/desktop/license-generator/package*.json ./apps/desktop/license-generator/
COPY apps/desktop/master/package*.json ./apps/desktop/master/
COPY apps/desktop/moneytrash/package*.json ./apps/desktop/moneytrash/
COPY apps/desktop/touch/package*.json ./apps/desktop/touch/
COPY apps/docs/package*.json ./apps/docs/
COPY apps/gallery/package*.json ./apps/gallery/
COPY apps/management/package*.json ./apps/management/
COPY apps/mobile/consumer/package*.json ./apps/mobile/consumer/
COPY apps/mobile/pro/package*.json ./apps/mobile/pro/
COPY apps/photographer-portal/package*.json ./apps/photographer-portal/
COPY apps/self-service/package*.json ./apps/self-service/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build all apps
RUN npm run build:all

# Production stage
FROM node:22-alpine AS production

# Add non-root user
USER node

WORKDIR /app

# Copy built applications
COPY --from=base --chown=node:node /app/apps/desktop/master/dist ./master
COPY --from=base --chown=node:node /app/apps/desktop/touch/dist ./touch
COPY --from=base --chown=node:node /app/apps/management/dist ./management
COPY --from=base --chown=node:node /app/apps/gallery/dist ./gallery

COPY --from=base --chown=node:node /app/scripts ./scripts
EXPOSE 8090 8091 3000 5173 5174 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8090/api/health || exit 1

CMD ["node", "scripts/start-production.js"]
