# ClickFlash — D1 Migration Deployment Plan

> **Status**: Created 2026-07-20 as part of Prompt A2 (Cloudflare D1 Migration Deployment Plan)
>
> **Prerequisites**: Ensure you are authenticated with Cloudflare CLI (`npx wrangler login`) and have the proper permissions to manage D1 databases in the production account.

> [!CAUTION]
> Execute these commands during a designated maintenance window or low-traffic period.
> Ensure that all workers referencing these databases are temporarily paused or that clients are aware of potential brief interruptions, although these migrations are additive and non-destructive.

---

## 1. Pre-migration Backups

Before applying any schema changes, take a snapshot of the current production databases.

```bash
# 1. Backup Gallery Database
npx wrangler d1 export gallery-db --remote --output=./backups/gallery-db-backup-$(date +%Y%m%d).sqlite3

# 2. Backup Website Database
npx wrangler d1 export clickflash-website-db --remote --output=./backups/clickflash-website-db-backup-$(date +%Y%m%d).sqlite3

# 3. Backup MoneyTrash Database
npx wrangler d1 export moneytrash-db --remote --output=./backups/moneytrash-db-backup-$(date +%Y%m%d).sqlite3
```

> [!IMPORTANT]
> Verify that the `.sqlite3` backup files have been created successfully and contain data before proceeding.

---

## 2. Gallery Worker Migrations

The Gallery Worker has two new migration files that must be applied.

### Apply `001_security_rate_limits.sql`

This migration adds tables for rate limiting and login attempts. It must be applied to **both** the `gallery-db` and the `clickflash-website-db`.

```bash
# Apply to gallery-db
npx wrangler d1 execute gallery-db --remote --file=workers/gallery-worker/migrations/001_security_rate_limits.sql

# Apply to clickflash-website-db
npx wrangler d1 execute clickflash-website-db --remote --file=workers/gallery-worker/migrations/001_security_rate_limits.sql
```

### Apply `002_online_commerce.sql`

This migration adds tables for abandoned carts and webhook events. It only applies to `gallery-db`.

```bash
# Apply to gallery-db
npx wrangler d1 execute gallery-db --remote --file=workers/gallery-worker/migrations/002_online_commerce.sql
```

---

## 3. MoneyTrash Worker Migrations

The MoneyTrash Worker has three new migration files that must be applied **in order**.

### Apply `001_secure_multipart_uploads.sql`

Adds the `upload_parts` table for secure chunked uploads.

```bash
npx wrangler d1 execute moneytrash-db --remote --file=workers/moneytrash-worker/migrations/001_secure_multipart_uploads.sql
```

### Apply `002_gallery_expiration.sql`

Adds the `expires_at` column to the `galleries` table and populates it.

```bash
npx wrangler d1 execute moneytrash-db --remote --file=workers/moneytrash-worker/migrations/002_gallery_expiration.sql
```

### Apply `003_b2b_commerce.sql`

Adds B2B checkout state columns to the `orders` table.

```bash
npx wrangler d1 execute moneytrash-db --remote --file=workers/moneytrash-worker/migrations/003_b2b_commerce.sql
```

---

## 4. Verification

Run the following test queries to ensure the schema changes were applied correctly.

### Verify Gallery DB

```bash
# Check rate limits table
npx wrangler d1 execute gallery-db --remote --command="SELECT count(*) FROM pragma_table_info('rate_limit_events');"

# Check abandoned carts table
npx wrangler d1 execute gallery-db --remote --command="SELECT count(*) FROM pragma_table_info('abandoned_carts');"
```

### Verify Website DB

```bash
# Check rate limits table
npx wrangler d1 execute clickflash-website-db --remote --command="SELECT count(*) FROM pragma_table_info('rate_limit_events');"
```

### Verify MoneyTrash DB

```bash
# Check upload parts table
npx wrangler d1 execute moneytrash-db --remote --command="SELECT count(*) FROM pragma_table_info('upload_parts');"

# Check new columns in galleries and orders
npx wrangler d1 execute moneytrash-db --remote --command="SELECT count(*) FROM pragma_table_info('galleries') WHERE name='expires_at';"
npx wrangler d1 execute moneytrash-db --remote --command="SELECT count(*) FROM pragma_table_info('orders') WHERE name='gallery_id';"
```

If any query returns `0` or an error indicating the table/column does not exist, the migration failed.

---

## 5. Rollback Strategy

If a migration fails or causes application-level regressions, you can restore the databases from the pre-migration SQLite backups.

> [!CAUTION]
> Restoring from a backup will overwrite **all** data in the remote D1 database, including any data written since the backup was taken. This will cause data loss for any operations that occurred after the backup.

```bash
# Rollback Gallery Database
npx wrangler d1 execute gallery-db --remote --file=./backups/gallery-db-backup-[DATE].sqlite3

# Rollback Website Database
npx wrangler d1 execute clickflash-website-db --remote --file=./backups/clickflash-website-db-backup-[DATE].sqlite3

# Rollback MoneyTrash Database
npx wrangler d1 execute moneytrash-db --remote --file=./backups/moneytrash-db-backup-[DATE].sqlite3
```
