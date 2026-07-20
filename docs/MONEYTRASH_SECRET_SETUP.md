# MoneyTrash Secret Configuration

> **Status**: Created 2026-07-20 as part of Prompt A3 (MoneyTrash Worker Secret Configuration)

The MoneyTrash Cloudflare Worker requires 5 critical secrets to be configured before deployment. This guide covers how to generate them, configure them in Cloudflare, and register the necessary Stripe webhooks.

---

## 1. Secret Generation

Open your terminal and use OpenSSL to generate strong random values for your internal secrets. Run each command and copy the output to a secure password manager.

```bash
# 1. JWT_SECRET (Used to sign short-lived tokens for offices and galleries)
openssl rand -hex 32

# 2. MASTER_API_KEY (Used to provision new MoneyTrash offices)
openssl rand -hex 32

# 3. WEBHOOK_SECRET (Used for internal webhook verification, if applicable)
openssl rand -hex 32
```

For Stripe secrets (`STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`), see Section 3 below.

---

## 2. Cloudflare Worker Configuration

Execute the following commands to securely store the secrets in your production Cloudflare Worker environment.

When prompted, paste the corresponding value you generated (or retrieved from Stripe).

```bash
# Set the JWT Secret
npx wrangler secret put JWT_SECRET --name moneytrash-api --env=""

# Set the Master API Key
npx wrangler secret put MASTER_API_KEY --name moneytrash-api --env=""

# Set the Internal Webhook Secret
npx wrangler secret put WEBHOOK_SECRET --name moneytrash-api --env=""

# Set the Stripe Secret Key (e.g., sk_live_...)
npx wrangler secret put STRIPE_SECRET_KEY --name moneytrash-api --env=""

# Set the Stripe Webhook Secret (e.g., whsec_...)
npx wrangler secret put STRIPE_WEBHOOK_SECRET --name moneytrash-api --env=""
```

> [!NOTE]
> For the staging environment, append `--env staging` to the commands above and use your test-mode Stripe keys.

---

## 3. Stripe Webhook Registration

To support MoneyTrash B2B commerce, Stripe must be configured to send checkout events to your Worker.

1. Go to the [Stripe Dashboard > Developers > Webhooks](https://dashboard.stripe.com/webhooks).
2. Click **Add endpoint**.
3. Set the **Endpoint URL** to your deployed MoneyTrash Worker API route:
   `https://moneytrash-api.clickflash.workers.dev/api/stripe/webhook`
   *(Replace with your custom domain if applicable).*
4. Under **Select events to listen to**, select the following 4 events exactly:
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
   - `checkout.session.async_payment_failed`
   - `checkout.session.expired`
5. Click **Add endpoint**.
6. On the webhook details page, locate the **Signing secret** (it starts with `whsec_`). Reveal it and use it for the `STRIPE_WEBHOOK_SECRET` in step 2.

---

## 4. Legacy Credential Cleanup

If you ever provisioned an office with the test identifier `MT-TEST-01` under the legacy schema, you should verify its existence and remove it from the remote database to prevent unauthorized local uploads.

```bash
# Check for the legacy office
npx wrangler d1 execute moneytrash-db --remote --command="SELECT id, name FROM offices WHERE id = 'MT-TEST-01';"

# If a row is returned, delete it:
npx wrangler d1 execute moneytrash-db --remote --command="DELETE FROM offices WHERE id = 'MT-TEST-01';"
```
