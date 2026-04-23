# ClickFlash Makefile
# Cross-platform build commands

.PHONY: help install install-all build build-all test test-all clean clean-all start start-all lint lint-all docker-up docker-down

# Default target
help:
	@echo "ClickFlash Photography Ecosystem - Available Commands:"
	@echo ""
	@echo "Setup:"
	@echo "  make install-all     - Install dependencies for all apps"
	@echo "  make install-MASTER  - Install Master app dependencies"
	@echo "  make install-TOUCH   - Install Touch app dependencies"
	@echo ""
	@echo "Development:"
	@echo "  make start-all       - Start all apps in development mode"
	@echo "  make start-master    - Start Master app only"
	@echo "  make start-touch     - Start Touch app only"
	@echo ""
	@echo "Build:"
	@echo "  make build-all       - Build all apps for production"
	@echo "  make build-master    - Build Master app"
	@echo "  make build-touch     - Build Touch app"
	@echo ""
	@echo "Test:"
	@echo "  make test-all        - Run all tests"
	@echo "  make test-master     - Run Master app tests"
	@echo "  make test-e2e        - Run E2E tests"
	@echo ""
	@echo "Maintenance:"
	@echo "  make clean-all       - Clean all build artifacts"
	@echo "  make lint-all        - Run linting on all apps"
	@echo "  make docker-up       - Start Docker development environment"
	@echo "  make docker-down     - Stop Docker containers"

# ==========================================
# Install
# ==========================================
install-all:
	@echo "Installing dependencies for all apps..."
	cd apps/master && npm install
	cd apps/touch && npm install
	cd apps/moneytrash && npm install
	cd apps/management && npm install
	cd apps/gallery && npm install
	cd apps/website && npm install

install-master:
	cd apps/master && npm install

install-touch:
	cd apps/touch && npm install

# ==========================================
# Development
# ==========================================
start-all:
	@echo "Starting all apps..."
	start cmd /c "cd apps/master && npm run dev:full"
	timeout /t 5
	start cmd /c "cd apps/touch && npm run dev"
	start cmd /c "cd apps/moneytrash && npm run dev"
	start cmd /c "cd apps/management && npm run dev"
	start cmd /c "cd apps/gallery && npm run dev"

start-master:
	cd apps/master && npm run dev:full

start-touch:
	cd apps/touch && npm run dev

# ==========================================
# Build
# ==========================================
build-all:
	@echo "Building all apps..."
	cd apps/master && npm run build
	cd apps/touch && npm run build
	cd apps/moneytrash && npm run build
	cd apps/management && npm run build
	cd apps/gallery && npm run build
	cd apps/website && npm run build

build-master:
	cd apps/master && npm run build

build-touch:
	cd apps/touch && npm run build

# ==========================================
# Package (Desktop apps)
# ==========================================
dist-all:
	@echo "Packaging desktop apps..."
	cd apps/master && npm run dist
	cd apps/touch && npm run dist

dist-master:
	cd apps/master && npm run dist

dist-touch:
	cd apps/touch && npm run dist

# ==========================================
# Test
# ==========================================
test-all:
	@echo "Running all tests..."
	cd apps/master && npm test
	cd apps/touch && npm test
	cd apps/moneytrash && npm test
	cd apps/management && npm test
	cd apps/gallery && npm test

test-master:
	cd apps/master && npm test

test-e2e-master:
	cd apps/master && npm run test:e2e

test-e2e-touch:
	cd apps/touch && npm run test:e2e

# ==========================================
# Lint
# ==========================================
lint-all:
	@echo "Running linting..."
	cd apps/master && npm run lint
	cd apps/touch && npm run lint
	cd apps/moneytrash && npm run lint
	cd apps/management && npm run lint
	cd apps/gallery && npm run lint

lint-master:
	cd apps/master && npm run lint

lint-fix-all:
	cd apps/master && npm run lint:fix
	cd apps/touch && npm run lint:fix
	cd apps/moneytrash && npm run lint:fix
	cd apps/management && npm run lint:fix
	cd apps/gallery && npm run lint:fix

# ==========================================
# Clean
# ==========================================
clean-all:
	@echo "Cleaning all build artifacts..."
	cd apps/master && npm run clean
	cd apps/touch && npm run clean
	cd apps/moneytrash && rm -rf .next node_modules
	cd apps/management && rm -rf dist node_modules
	cd apps/gallery && rm -rf dist node_modules
	cd apps/website && rm -rf .next node_modules

clean-master:
	cd apps/master && npm run clean

clean-touch:
	cd apps/touch && npm run clean

# ==========================================
# Docker
# ==========================================
docker-up:
	docker-compose up -d

docker-down:
	docker-compose down

docker-build:
	docker-compose build

docker-logs:
	docker-compose logs -f

# ==========================================
# Database
# ==========================================
db-backup:
	@echo "Creating database backup..."
	mkdir -p backups
	cp apps/master/data/clickflash.db backups/clickflash-$(shell date +%Y%m%d-%H%M%S).db

db-migrate:
	cd apps/master/backend && node scripts/migrate.js

db-seed:
	cd apps/master/backend && node scripts/seed.js

# ==========================================
# Release
# ==========================================
version-patch:
	npm version patch

version-minor:
	npm version minor

version-major:
	npm version major

tag-release:
	git tag -a v$(shell node -p "require('./package.json').version") -m "Release v$(shell node -p "require('./package.json').version")"
	git push origin v$(shell node -p "require('./package.json').version")"

# ==========================================
# Utilities
# ==========================================
format-all:
	cd apps/master && npx prettier --write .
	cd apps/touch && npx prettier --write .
	cd apps/moneytrash && npx prettier --write .
	cd apps/management && npx prettier --write .
	cd apps/gallery && npx prettier --write .

type-check-all:
	cd apps/master && npx tsc --noEmit
	cd apps/touch && npx tsc --noEmit
	cd apps/moneytrash && npx tsc --noEmit
	cd apps/management && npx tsc --noEmit
	cd apps/gallery && npx tsc --noEmit
