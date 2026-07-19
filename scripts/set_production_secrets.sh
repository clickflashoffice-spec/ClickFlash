#!/bin/bash

echo "Setting production secrets for ClickFlash Workers"
echo "You will be prompted to enter the values for each secret."

cd "$(dirname "$0")/../"

echo "=== Gallery Backend ==="
cd workers/gallery-worker
npx wrangler secret put JWT_SECRET --env=""
npx wrangler secret put STRIPE_SECRET_KEY --env=""
npx wrangler secret put STRIPE_WEBHOOK_SECRET --env=""
cd ../../

echo "=== Management Hub ==="
cd workers/management-worker
npx wrangler secret put JWT_SECRET --env=""
npx wrangler secret put PROVISIONING_SECRET --env=""
npx wrangler secret put LICENSE_PRIVATE_KEY --env=""
npx wrangler secret put STRIPE_PRO_PRICE_ID --env=""
npx wrangler secret put STRIPE_SECRET_KEY --env=""
npx wrangler secret put STRIPE_WEBHOOK_SECRET --env=""
cd ../../

echo "Production secrets configured successfully."
