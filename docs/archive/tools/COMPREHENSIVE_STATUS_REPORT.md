# COMPREHENSIVE STATUS REPORT — API KEYS, SECRETS, FRONTEND ANALYSIS

## 1. API KEY & SECRET INVENTORY
**Config files scanned:** 24
**Unique secret entries found:** 57

### By Pattern
- `SECRET_GENERIC`: 23 occurrences
- `JWT_SECRET`: 11 occurrences
- `API_KEY_GENERIC`: 8 occurrences
- `DATABASE_URL`: 3 occurrences
- `WEBHOOK_SECRET`: 3 occurrences
- `STRIPE_TEST_KEY`: 2 occurrences
- `R2_BUCKET`: 2 occurrences
- `ENCRYPTION_KEY`: 1 occurrences
- `CLOUDFLARE_API_TOKEN`: 1 occurrences
- `CLOUDFLARE_ACCOUNT_ID`: 1 occurrences
- `R2_ENDPOINT`: 1 occurrences
- `RESEND_API_KEY`: 1 occurrences

### Critical Exposures (Live Keys)
The following patterns indicate LIVE (non-test) keys that MUST be rotated immediately:

- `.env` line 61: `JWT_SECRET` = `dev-jwt-secret-change-in-...`
- `apps/gallery/backend/.env` line 3: `JWT_SECRET` = `test_gallery_secret_2026`
- `apps/management/backend/.env` line 3: `JWT_SECRET` = `uo4/b8fwePCa0IqO46WTEnrOp...`
- `apps/master/.env` line 7: `JWT_SECRET` = `dev-jwt-secret-change-in-...`
- `apps/master/backend/.env` line 9: `JWT_SECRET` = `8a624de6544ed58fe79d86137...`
- `apps/master/ClickFlash-Master-test-hotel-2/.env` line 11: `CLOUDFLARE_API_TOKEN` = `[REDACTED]...`
- `apps/master/ClickFlash-Master-test-hotel-2/.env` line 56: `JWT_SECRET` = `0471b46f3e8b6ee3b675bee38...`
- `apps/touch/.env` line 56: `JWT_SECRET` = `de8c75171b04901373c09dfd5...`
- `apps/touch/.env.production` line 10: `JWT_SECRET` = `CHANGE_THIS_TO_A_STRONG_R...`
- `apps/touch/backend/.env` line 3: `JWT_SECRET` = `dev_secret_key_touch`
- `apps/website/.env` line 31: `RESEND_API_KEY` = `[REDACTED]`
- `docs/archive/backends/management_root/.env` line 3: `JWT_SECRET` = `uo4/b8fwePCa0IqO46WTEnrOp...`
- `docs/archive/backups/.env` line 61: `JWT_SECRET` = `dev-jwt-secret-change-in-...`

### Test Keys (Rotate anyway for hygiene)

- `apps/management/backend/.env` line 6: `sk_test_4eC39HqLyjWDarjtT...`
- `docs/archive/backends/management_root/.env` line 6: `sk_test_4eC39HqLyjWDarjtT...`

## 2. FRONTEND API CONDITIONAL LOGIC ANALYSIS
**Total frontend API files:** 61
**Files with conditional/legacy patterns:** 23

### Files Requiring Cleanup (sorted by severity)

#### `apps/gallery/src/services/stripeEdgeService.ts`
- localhost_ref: 3 matches
- conditional_api: 3 matches

#### `apps/gallery/src/services/stripeService.ts`
- localhost_ref: 1 matches
- conditional_api: 1 matches

#### `apps/gallery/src/App.tsx`
- localhost_ref: 1 matches

#### `apps/gallery/src/setupTests.tsx`
- dual_backend: 3 matches

#### `apps/gallery/src/components/settings/GeneralSettings.tsx`
- localhost_ref: 2 matches

#### `apps/gallery/src/components/settings/KioskPairing.tsx`
- localhost_ref: 1 matches

#### `apps/gallery/src/components/touch/KioskSettingsModal.tsx`
- localhost_ref: 1 matches

#### `apps/gallery/src/services/advancedCheckout.ts`
- dual_backend: 2 matches

#### `apps/gallery/src/services/apiService.ts`
- localhost_ref: 1 matches

#### `apps/gallery/src/services/cloudApiService.ts`
- localhost_ref: 3 matches

#### `apps/gallery/src/services/faceRecognitionService.ts`
- localhost_ref: 1 matches

#### `apps/gallery/src/services/moneyTrashService.ts`
- conditional_api: 1 matches

#### `apps/gallery/src/services/pb.ts`
- localhost_ref: 2 matches

#### `apps/gallery/src/utils/testUtils.tsx`
- dual_backend: 2 matches

#### `apps/gallery/src/__tests__/orderAccess.test.ts`
- localhost_ref: 1 matches

#### `apps/management/src/setupTests.ts`
- localhost_ref: 1 matches

#### `apps/management/src/components/management/AIChatBot.tsx`
- conditional_api: 1 matches

#### `apps/management/src/components/management/settings/ConnectionSettings.tsx`
- localhost_ref: 2 matches

#### `apps/management/src/components/modals/ExtensionCreateModal.tsx`
- dual_backend: 2 matches

#### `apps/management/src/services/geminiService.ts`
- conditional_api: 1 matches

#### `apps/management/src/services/pb.ts`
- localhost_ref: 1 matches

#### `apps/management/src/utils/env.ts`
- localhost_ref: 2 matches

#### `apps/management/src/__mocks__/envMock.js`
- localhost_ref: 1 matches

## 3. ACTION ITEMS SUMMARY

### Immediate (P0)
1. [ ] Rotate Stripe test key (sk_test_...) at https://dashboard.stripe.com/test/apikeys
2. [ ] Rotate Resend API key at https://resend.com/api-keys
3. [ ] Rotate Cloudflare API token at https://dash.cloudflare.com/profile/api-tokens
4. [ ] Generate new JWT_SECRET: `openssl rand -hex 32`
5. [ ] Update wrangler secrets: `wrangler secret put JWT_SECRET`
6. [ ] Run git-filter-repo to purge .env files from history
7. [ ] Clean 23 frontend files with localhost/conditional API references

### Short Term (P1)
8. [ ] Standardize all frontend API calls to use `cloudApiService.ts`
9. [ ] Remove localhost references from production code
10. [ ] Update VITE_API_URL to Worker domain in all .env.example files

### Verification
11. [ ] Run Playwright E2E on gallery + management (requires Worker endpoints to be live)
12. [ ] Confirm zero Express imports in active paths
13. [ ] Confirm all API calls go to Worker domain
