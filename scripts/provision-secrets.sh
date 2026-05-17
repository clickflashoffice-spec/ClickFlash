#!/usr/bin/env bash
# ClickFlash Cloud — Secrets Provisioning Script
# Run once per environment to set all required Cloudflare Worker secrets.
#
# Usage:
#   ./scripts/provision-secrets.sh              # interactive prompts
#   ./scripts/provision-secrets.sh --check      # audit which secrets are set
#
# Prerequisites:
#   - wrangler CLI authenticated (`wrangler login`)
#   - All D1 databases and R2 buckets created (see wrangler.toml files)

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

GALLERY_DIR="apps/gallery/backend"
MANAGEMENT_DIR="apps/management/backend"

# ── Required secrets per worker ──────────────────────────────────────────────
GALLERY_SECRETS=(
  "JWT_SECRET"
  "STRIPE_SECRET_KEY"
  "STRIPE_WEBHOOK_SECRET"
  "SENTRY_DSN"
)

MANAGEMENT_SECRETS=(
  "JWT_SECRET"
  "SENTRY_DSN"
)

check_mode() {
  echo -e "${YELLOW}Auditing secrets for gallery-backend...${NC}"
  for secret in "${GALLERY_SECRETS[@]}"; do
    if wrangler secret list --config "$GALLERY_DIR/wrangler.toml" 2>/dev/null | grep -q "$secret"; then
      echo -e "  ${GREEN}[SET]${NC} $secret"
    else
      echo -e "  ${RED}[MISSING]${NC} $secret"
    fi
  done

  echo -e "\n${YELLOW}Auditing secrets for management-hub...${NC}"
  for secret in "${MANAGEMENT_SECRETS[@]}"; do
    if wrangler secret list --config "$MANAGEMENT_DIR/wrangler.toml" 2>/dev/null | grep -q "$secret"; then
      echo -e "  ${GREEN}[SET]${NC} $secret"
    else
      echo -e "  ${RED}[MISSING]${NC} $secret"
    fi
  done
}

provision_worker() {
  local worker_name=$1
  local config_path=$2
  shift 2
  local secrets=("$@")

  echo -e "\n${YELLOW}Provisioning secrets for ${worker_name}...${NC}"

  for secret in "${secrets[@]}"; do
    echo -n "  Enter value for ${secret} (or press Enter to skip): "
    read -rs value
    echo ""

    if [ -n "$value" ]; then
      echo "$value" | wrangler secret put "$secret" --config "$config_path/wrangler.toml" 2>/dev/null
      echo -e "  ${GREEN}[SET]${NC} $secret"
    else
      echo -e "  ${YELLOW}[SKIPPED]${NC} $secret"
    fi
  done
}

# ── Main ─────────────────────────────────────────────────────────────────────

if [ "${1:-}" = "--check" ]; then
  check_mode
  exit 0
fi

echo "ClickFlash Cloud — Secrets Provisioning"
echo "========================================"
echo ""
echo "This script sets Cloudflare Worker secrets for gallery-backend and management-hub."
echo "Values are stored encrypted in Cloudflare and never written to disk."
echo ""
echo -e "${RED}WARNING: Do not set secrets in wrangler.toml [vars] — those are plaintext.${NC}"
echo ""

provision_worker "gallery-backend" "$GALLERY_DIR" "${GALLERY_SECRETS[@]}"
provision_worker "management-hub" "$MANAGEMENT_DIR" "${MANAGEMENT_SECRETS[@]}"

echo ""
echo -e "${GREEN}Done. Run './scripts/provision-secrets.sh --check' to verify.${NC}"
