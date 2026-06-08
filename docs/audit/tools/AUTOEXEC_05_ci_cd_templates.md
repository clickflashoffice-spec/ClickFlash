# CI/CD Workflow Templates

## 1. Secret Scanning Workflow (`.github/workflows/secret-scan.yml`)

```yaml
name: Secret Scanning
on: [push, pull_request]
jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - name: Detect secrets
        uses: trufflesecurity/trufflehog@main
        with:
          path: ./
          base: main
          head: HEAD
          extra_args: --debug --only-verified
```

## 2. Dependency Audit Workflow (`.github/workflows/dependency-audit.yml`)

```yaml
name: Dependency Audit
on:
  schedule:
    - cron: '0 9 * * 1'
  push:
    paths:
      - '**/package.json'
      - 'pnpm-lock.yaml'
jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm audit --audit-level moderate
      - name: Comment on PR
        if: failure()
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '⚠️ Dependency vulnerabilities detected. Run `pnpm audit` locally and patch.'
            })
```

## 3. TypeScript Typecheck Workflow (`.github/workflows/typecheck.yml`)

```yaml
name: TypeScript Typecheck
on: [push, pull_request]
jobs:
  typecheck:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        app: [master, touch, gallery, management, moneytrash, website, installer]
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter ${{ matrix.app }} typecheck
        continue-on-error: true
```

## 4. E2E Test Workflow (`.github/workflows/e2e.yml`)

```yaml
name: E2E Tests
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @clickflash/ecosystem-tests test:e2e
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: tests/ecosystem/playwright-report/
```

## 5. Production Deployment Workflow (`.github/workflows/deploy-production.yml`)

```yaml
name: Deploy Production
on:
  push:
    tags:
      - 'v*'
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @clickflash/website build
      - run: pnpm --filter @clickflash/gallery build
      - name: Deploy to Cloudflare
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
        run: pnpm --filter @clickflash/website deploy:cf
```

## 6. Pre-commit Hook (Local)

Place in `.git/hooks/pre-commit` (or use Husky):

```bash
#!/bin/bash
# Block .env files from being committed
if git diff --cached --name-only | grep -qE '\.env($|\.example$)'; then
  echo "❌ Commit blocked: .env files detected. Use .env.example templates only."
  exit 1
fi

# Run typecheck on changed packages
changed=$(git diff --cached --name-only | grep -E '^apps/' | cut -d/ -f2 | sort -u)
for app in $changed; do
  if [ -f "apps/$app/package.json" ]; then
    echo "🔍 Running typecheck for $app..."
    pnpm --filter $app typecheck || true
  fi
done
```

## 7. Migration Validation Workflow (`.github/workflows/migration-check.yml`)

```yaml
name: Migration Validation
on: [pull_request]
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Check for duplicate migration prefixes
        run: |
          duplicates=$(find apps -name '*.sql' -o -name '*migration*' | grep -oE '^[0-9]+' | sort | uniq -d)
          if [ -n "$duplicates" ]; then
            echo "❌ Duplicate migration prefixes found: $duplicates"
            exit 1
          fi
```

## Usage Instructions

1. Copy the desired workflow YAML into `.github/workflows/` in your repository root.
2. Ensure `pnpm` is installed in CI (use `pnpm/action-setup`).
3. Store all secrets in GitHub Actions Secrets (Settings > Secrets and variables > Actions).
4. Do NOT commit `.env` files — the pre-commit hook and secret scanning workflow will block them.
