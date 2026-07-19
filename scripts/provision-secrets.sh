#!/usr/bin/env bash
# Audit or provision the secrets consumed by the canonical Cloudflare Workers.
# Defaults to staging so an unqualified invocation cannot mutate production.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
MODE="provision"
ENVIRONMENT="staging"

usage() {
  echo "Usage: ./scripts/provision-secrets.sh [--check] [--env staging|production]"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --check)
      MODE="check"
      shift
      ;;
    --env)
      [[ $# -ge 2 ]] || { usage; exit 2; }
      ENVIRONMENT="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      usage
      exit 2
      ;;
  esac
done

if [[ "$ENVIRONMENT" != "staging" && "$ENVIRONMENT" != "production" ]]; then
  echo "Environment must be staging or production." >&2
  exit 2
fi

if [[ "$ENVIRONMENT" == "staging" ]]; then
  WRANGLER_ENV_ARGS=(--env staging)
else
  WRANGLER_ENV_ARGS=(--env=)
fi

GALLERY_SECRETS=(
  JWT_SECRET
  STRIPE_SECRET_KEY
  STRIPE_WEBHOOK_SECRET
  RESEND_API_KEY
)

MANAGEMENT_SECRETS=(
  JWT_SECRET
  PROVISIONING_SECRET
  LICENSE_PRIVATE_KEY
  STRIPE_PRO_PRICE_ID
  STRIPE_SECRET_KEY
  STRIPE_WEBHOOK_SECRET
  RESEND_API_KEY
)

MONEYTRASH_SECRETS=(
  JWT_SECRET
  MASTER_API_KEY
  STRIPE_SECRET_KEY
  STRIPE_WEBHOOK_SECRET
  WEBHOOK_SECRET
)

secret_list() {
  local worker_dir=$1
  (cd "$REPO_ROOT/$worker_dir" && pnpm exec wrangler secret list "${WRANGLER_ENV_ARGS[@]}")
}

check_worker() {
  local worker_name=$1
  local worker_dir=$2
  shift 2
  local secrets=("$@")
  local configured

  echo "Auditing $worker_name ($ENVIRONMENT)..."
  configured="$(secret_list "$worker_dir")"
  for secret in "${secrets[@]}"; do
    if grep -q "\"name\"[[:space:]]*:[[:space:]]*\"$secret\"" <<< "$configured"; then
      echo "  [SET] $secret"
    else
      echo "  [MISSING] $secret"
    fi
  done
}

provision_worker() {
  local worker_name=$1
  local worker_dir=$2
  shift 2
  local secrets=("$@")

  echo "Provisioning $worker_name ($ENVIRONMENT)..."
  for secret in "${secrets[@]}"; do
    local value
    read -rsp "  Enter $secret (blank skips): " value
    echo
    if [[ -z "$value" ]]; then
      echo "  [SKIPPED] $secret"
      continue
    fi

    (cd "$REPO_ROOT/$worker_dir" && printf '%s' "$value" | pnpm exec wrangler secret put "$secret" "${WRANGLER_ENV_ARGS[@]}")
    unset value
    echo "  [SET] $secret"
  done
}

run_for_all_workers() {
  local operation=$1
  "$operation" "gallery-backend" "workers/gallery-worker" "${GALLERY_SECRETS[@]}"
  "$operation" "management-hub" "workers/management-worker" "${MANAGEMENT_SECRETS[@]}"
  "$operation" "moneytrash-api" "workers/moneytrash-worker" "${MONEYTRASH_SECRETS[@]}"
}

echo "ClickFlash Cloud secrets: $MODE / $ENVIRONMENT"
if [[ "$MODE" == "check" ]]; then
  run_for_all_workers check_worker
else
  echo "Secrets are sent directly to Cloudflare and are never written to disk."
  run_for_all_workers provision_worker
fi
