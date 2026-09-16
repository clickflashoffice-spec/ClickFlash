# ClickFlash Root Dockerfile
# Optimized for monorepo using turbo prune
# Allows building individual microservices securely and deterministically.

FROM node:22-alpine AS alpine
RUN apk update && apk add --no-cache python3 make g++ git
RUN corepack enable && corepack prepare pnpm@10.28.2 --activate

FROM alpine AS builder
WORKDIR /app
RUN pnpm install -g turbo
COPY . .
# ARG APP_NAME must be the package name, e.g. @clickflash/gallery
ARG APP_NAME=@clickflash/gallery
RUN turbo prune --scope=${APP_NAME} --docker

FROM alpine AS installer
WORKDIR /app
COPY .gitignore .gitignore
COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install --frozen-lockfile

COPY --from=builder /app/out/full/ .
ARG APP_NAME=@clickflash/gallery
RUN pnpm turbo run build --filter=${APP_NAME}...

FROM alpine AS runner
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nodejs
USER nodejs

# Copy the built output from the installer stage.
COPY --from=installer --chown=nodejs:nodejs /app .

ARG APP_NAME=@clickflash/gallery
ENV APP_NAME=${APP_NAME}

# Expose common standard ports 
EXPOSE 8090 8091 3000 5173 5174 3001

CMD ["sh", "-c", "pnpm --filter ${APP_NAME} run start"]
