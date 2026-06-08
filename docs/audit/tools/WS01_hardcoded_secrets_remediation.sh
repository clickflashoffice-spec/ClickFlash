#!/bin/bash
# Hardcoded Secret Remediation Script
# Review each finding before running any replacement

echo '=== Files with hardcoded passwords/default credentials ==='
echo 'FILE: apps/gallery/backend/legacy/__tests__/master-api.test.js:128 [wrangler_secret]'
echo '  SNIPPET:  = TEST_PORT;     process.env.JWT_SECRET = 'test-secret-key-for-testing-only';      // Start test server   '

echo 'FILE: apps/management/backend/scripts/verify_inventory_api.js:64 [default_password]'
echo '  SNIPPET: mail: 'admin@clickflash.com', password: 'password' });          if (loginRes.sta'

echo 'FILE: apps/management/backend/scripts/verify_inventory_api.js:71 [default_password]'
echo '  SNIPPET: , '/login', { email: 'admin', password: 'password' });             if (loginRes2'

echo 'FILE: apps/management/backend/src/benchmark-jwt.js:4 [wrangler_secret]'
echo '  SNIPPET: loudflare-worker-jwt';  const JWT_SECRET = 'benchmark_secret_2026'; const payload = { desk_id: ''

echo 'FILE: apps/management/backend/src/pentest-isolation.js:7 [wrangler_secret]'
echo '  SNIPPET: ction, id = null) {     const JWT_SECRET = 'mock_secret_2026'; // Match implementation or p'

echo 'FILE: apps/management/backend/__tests__/master-api.test.js:128 [wrangler_secret]'
echo '  SNIPPET:  = TEST_PORT;     process.env.JWT_SECRET = 'test-secret-key-for-testing-only';      // Start test server   '

echo 'FILE: apps/master/backend/middleware/permissions.ts:47 [admin_user_seed]'
echo '  SNIPPET: VIEW: "system:view",   SYSTEM_ADMIN: "system:admin", } as const;  export type Per'

echo '=== Files with hardcoded JWT secrets ==='
echo 'FILE: apps/gallery/backend/legacy/__tests__/master-api.test.js:128'
echo '  SNIPPET:  = TEST_PORT;     process.env.JWT_SECRET = 'test-secret-key-for-testing-only';      // Start test server   '
# TODO: Replace hardcoded JWT_SECRET with process.env.JWT_SECRET or wrangler secret put JWT_SECRET

echo 'FILE: apps/management/backend/src/benchmark-jwt.js:4'
echo '  SNIPPET: loudflare-worker-jwt';  const JWT_SECRET = 'benchmark_secret_2026'; const payload = { desk_id: ''
# TODO: Replace hardcoded JWT_SECRET with process.env.JWT_SECRET or wrangler secret put JWT_SECRET

echo 'FILE: apps/management/backend/src/pentest-isolation.js:7'
echo '  SNIPPET: ction, id = null) {     const JWT_SECRET = 'mock_secret_2026'; // Match implementation or p'
# TODO: Replace hardcoded JWT_SECRET with process.env.JWT_SECRET or wrangler secret put JWT_SECRET

echo 'FILE: apps/management/backend/src/__tests__/server.test.ts:30'
echo '  SNIPPET: ERY_BUCKET: mockR2Bucket,     JWT_SECRET: 'test-secret-key-for-jwt-signing',     ALLOWED_ORIGINS: '*',   '
# TODO: Replace hardcoded JWT_SECRET with process.env.JWT_SECRET or wrangler secret put JWT_SECRET

echo 'FILE: apps/management/backend/__tests__/master-api.test.js:128'
echo '  SNIPPET:  = TEST_PORT;     process.env.JWT_SECRET = 'test-secret-key-for-testing-only';      // Start test server   '
# TODO: Replace hardcoded JWT_SECRET with process.env.JWT_SECRET or wrangler secret put JWT_SECRET

echo 'FILE: apps/master/backend/__tests__/galleryCheckout.test.ts:91'
echo '  SNIPPET: ockLogger as any,             JWT_SECRET: 'test-secret',             syncManager: moc'
# TODO: Replace hardcoded JWT_SECRET with process.env.JWT_SECRET or wrangler secret put JWT_SECRET

echo '=== Manual Remediation Required ==='
echo '1. Replace default passwords with env-driven values or first-run setup'
echo '2. Move JWT_SECRET out of source files into .env (Node) or wrangler secrets (Worker)'
echo '3. Run: wrangler secret put JWT_SECRET'
echo '4. Delete old values from git history via git-filter-repo'