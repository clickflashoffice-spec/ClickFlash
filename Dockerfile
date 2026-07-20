# ClickFlash Root Dockerfile
# Used for CI/CD builds

FROM node:20-alpine AS base

# Install dependencies
RUN apk add --no-cache python3 make g++ git

WORKDIR /app

# Add pnpm installation
RUN corepack enable && corepack prepare pnpm@10.28.2 --activate

# Copy package files
COPY package*.json ./
COPY pnpm-workspace.yaml ./
COPY .npmrc ./
COPY apps/*/package*.json ./apps/*/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build all apps
RUN npm run build:all

# Production stage
FROM node:20-alpine AS production

# Add non-root user
USER node

WORKDIR /app

# Copy built applications
COPY --from=base /app/apps/master/dist ./master
COPY --from=base /app/apps/touch/dist ./touch
COPY --from=base /app/apps/moneytrash/.next ./moneytrash
COPY --from=base /app/apps/management/dist ./management
COPY --from=base /app/apps/gallery/dist ./gallery
COPY --from=base /app/apps/website/.next ./website

EXPOSE 8090 8091 3000 5173 5174 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8090/api/health || exit 1

CMD ["node", "scripts/start-production.js"]
