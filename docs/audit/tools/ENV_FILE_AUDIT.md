# .env File Audit Report

**Files Scanned:** 23
**Exposed Secrets Found:** 25

## Findings

| File | Line | Type | Key Preview |
|------|------|------|-------------|
| `apps/management/backend/.env` | 11 | api_key | `re_QFSmBqtb_7k64pfapYhibgNMZdAcN1eUd` |
| `apps/master/.env` | 9 | password | `admin123` |
| `apps/master/.env` | 62 | api_key | `re_QFSmBqtb_7k64pfapYhibgNMZdAcN1eUd` |
| `apps/master/backend/.env` | 9 | jwt | `8a624de6544ed58fe79d...a785b01b919050f90287` |
| `apps/master/backend/.env` | 17 | password | `CHANGEME_set_strong_password` |
| `apps/master/backend/.env` | 23 | password | `CHANGEME_update_credentials` |
| `apps/master/backend/.env` | 30 | api_key | `CHANGEME_update_r2_secret` |
| `apps/master/backend/setup/config-template.env` | 97 | jwt | `change-this-in-production` |
| `apps/master/backend/setup/config-template.env` | 38 | api_key | `your-cloudflare-api-token` |
| `apps/master/backend/setup/profiles/concorde.env` | 18 | password | `clickflash2025` |
| `apps/master/backend/setup/profiles/marhaba-club.env` | 18 | password | `clickflash2025` |
| `apps/master/backend/setup/profiles/marhaba-occidental.env` | 18 | password | `clickflash2025` |
| `apps/master/ClickFlash-Master-test-hotel-2/.env` | 11 | cloudflare | `cfut_WNDywpLDOQqLb9z...eVIjN9BKV4Tab937ffb1` |
| `apps/master/ClickFlash-Master-test-hotel-2/.env` | 56 | jwt | `0471b46f3e8b6ee3b675...c89e5f933f01aa58edd0` |
| `apps/master/ClickFlash-Master-test-hotel-2/.env` | 38 | password | `TestPass123!` |
| `apps/master/ClickFlash-Master-test-hotel-2/.env` | 74 | password | `TestPass123!` |
| `apps/master/ClickFlash-Master-test-hotel-2/.env` | 30 | api_key | `3a67678a197fb84adc4c...880364aa141369178e15` |
| `apps/master/ClickFlash-Master-test-hotel-2/.env` | 43 | api_key | `bcd9fc8ada43e7b46ba1...fab4c3d2396ac0e40aa4` |
| `apps/master/ClickFlash-Master-test-hotel-2/.env` | 47 | api_key | `defaf6a2e48c51d244e7...8b59770b956d859e67df` |
| `apps/master/configs/club.env` | 11 | jwt | `clickflash_club_secure_secret_2025` |
| `apps/master/configs/concorde.env` | 11 | jwt | `clickflash_concorde_secure_secret_2025` |
| `apps/master/configs/occidental.env` | 11 | jwt | `clickflash_occidental_secure_secret_2025` |
| `apps/moneytrash/.env` | 24 | api_key | `79t16ZCsUW8QklRMdSxjVicPJLmGBn3a` |
| `apps/touch/.env` | 56 | jwt | `de8c75171b04901373c0...ef2b739cf4a5880c84d6` |
| `apps/touch/.env.production` | 16 | password | `ChangeThisSecurePassword123!` |

## Action Required

1. Replace all exposed keys with new rotated values
2. Never commit .env files (already in .gitignore)
3. Use .env.example for templates
4. Consider using a secret manager (1Password, Doppler, Vault)