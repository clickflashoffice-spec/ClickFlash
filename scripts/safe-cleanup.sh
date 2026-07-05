#!/usr/bin/env bash
# ClickFlash Safe Cleanup Script
# Removes build artifacts, caches, and stray lockfiles only.
# NEVER deletes application source code or functional assets.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "ClickFlash Safe Cleanup — starting in $ROOT"

# Build caches
echo "  -> Removing .turbo cache..."
rm -rf .turbo/cache

# App build outputs (not source)
echo "  -> Removing app build outputs..."
for app in apps/*; do
  if [ -d "$app" ]; then
    rm -rf "$app/dist" "$app/.next" "$app/out" "$app/release" "$app/node_modules/.cache"
  fi
done

# Root node cache
rm -rf node_modules/.cache

# Stray lockfiles from other package managers
echo "  -> Removing stray package-lock.json files..."
find packages -name "package-lock.json" -type f -delete || true

# Embedded node_modules in docs/archive
echo "  -> Removing docs/archive node_modules..."
find docs/archive -type d -name node_modules -prune -exec rm -rf {} + || true

# TypeScript build info
echo "  -> Removing tsconfig.tsbuildinfo files..."
find . -name "*.tsbuildinfo" -type f -not -path "*/node_modules/*" -delete || true

# Committed installer artifacts (should be CI-generated)
echo "  -> Removing committed .exe installers..."
find release RELEASES apps/installer/release apps/license-generator/release -type f \( -name "*.exe" -o -name "*.blockmap" -o -name "*.yml" -o -name "*.yaml" \) -delete 2>/dev/null || true

# Empty stale dist folders left behind
find apps -type d -empty -name dist -delete 2>/dev/null || true

echo "Safe cleanup complete."
