# MASTER EXECUTION SCRIPT — RESULTS REPORT

## Execution Status

- [x] Pre-commit hook: Attempted (template not found at expected path)
- [x] .env removal from git tracking: COMMITTED
- [x] pnpm install: SUCCESS (with peer dependency warnings)
- [x] pnpm audit --prod --audit-level high: FAILED (91 vulnerabilities found)
- [ ] Typecheck: Skipped due to audit failure
- [ ] Build: Skipped due to audit failure
- [ ] Tests: Skipped due to audit failure

## Vulnerability Summary

- **Critical**: 1
- **High**: 48
- **Moderate**: 37
- **Low**: 5

## Top Priority Patches

- **protobufjs** (critical): `apps__gallery>@google/genai>protobufjs` → upgrade to `>=7.5.5`
- **react-router** (high): `apps__master>react-router-dom>react-router` → upgrade to `>=7.15.0`
- **next** (high): `apps__website>next` → upgrade to `>=15.5.18`
- **tar** (high): `apps__touch>bcrypt>@mapbox/node-pre-gyp>tar` → upgrade to `>=7.5.11`
- **systeminformation** (high): `apps__master>systeminformation` → upgrade to `>=5.31.6`
- **minimatch** (high): `apps__master>archiver>readdir-glob>minimatch` → upgrade to `>=9.0.7`
- **rollup** (high): `apps__website>@sentry/nextjs>rollup` → upgrade to `>=4.59.0`
- **lodash** (high): `apps__master>archiver>archiver-utils>lodash` → upgrade to `>=4.18.0`
- **fast-xml-parser** (high): `apps__moneytrash>@aws-sdk/client-s3>@aws-sdk/core>@aws-sdk/xml-builder>fast-xml-parser` → upgrade to `>=5.5.6`
- **serialize-javascript** (high): `apps__website>@sentry/nextjs>@sentry/webpack-plugin>webpack>terser-webpack-plugin>serialize-javascript` → upgrade to `>=7.0.3`

## Peer Dependency Warnings

- apps/gallery: @stripe/react-stripe-js unmet peer react@^16.8.0 || ^17.0.0 || ^18.0.0 (found 19.2.4)
- apps/master: dmg-builder / electron-builder-squirrel-windows version mismatch
- apps/touch: dmg-builder / electron-builder-squirrel-windows version mismatch
- apps/website: @cloudflare/next-on-pages missing peer vercel@>=30.0.0 && <=47.0.4

## Next Steps

1. **CRITICAL**: Upgrade `protobufjs` in apps/gallery (CVE-2026-XXXX, critical)
2. **HIGH**: Upgrade `react-router` in apps/master to >=7.15.0
3. **HIGH**: Upgrade `next` in apps/website and apps/master to >=15.5.18
4. **HIGH**: Upgrade `tar` in apps/touch via bcrypt dependency
5. **HIGH**: Upgrade `systeminformation` in apps/master
6. Run `pnpm audit --fix` where safe
7. Re-run master execution script after patching