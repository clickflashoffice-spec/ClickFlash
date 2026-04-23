# ClickFlash CI/CD Optimization Guide

## Overview

This document outlines the CI/CD pipeline optimizations for the ClickFlash ecosystem, covering Cloudflare Wrangler deployments and Tauri desktop builds.

## Cloud Apps (Management, Gallery, Website)

### Wrangler Deployment Optimizations

#### 1. Incremental Deployments

```yaml
# Use wrangler pages deploy with --dry-run for validation
- name: Validate Deployment
  run: |
    npx wrangler pages deploy dist --project-name=management-hub --dry-run
```

#### 2. Caching Strategy

```yaml
# Cache Wrangler configuration and node_modules
- name: Cache Build Dependencies
  uses: actions/cache@v4
  with:
    path: |
      ~/.npm
      apps/management/node_modules
      apps/gallery/node_modules
    key: ${{ runner.os }}-deps-${{ hashFiles('**/package-lock.json') }}
    restore-keys: |
      ${{ runner.os }}-deps-
```

#### 3. Parallel Deployments

```yaml
# Deploy all cloud apps in parallel
deploy-cloud:
  name: Deploy Cloud Apps
  runs-on: ubuntu-latest
  strategy:
    matrix:
      app: [management, gallery, website]
    fail-fast: false
```

#### 4. Environment Variables Best Practices

```bash
# Use .env.production for production builds
VITE_API_URL=${{ secrets.MANAGEMENT_API_URL }}
VITE_APP_VERSION=${{ github.ref_name }}
```

### Wrangler Configuration

```toml
# wrangler.toml for Management/Gallery
name = "management-hub"
compatibility_date = "2024-01-01"
pages_build_output_dir = "dist"

# Enable preview mode for branches
vars = { ENVIRONMENT = "production" }

# KV Namespace bindings
kv_namespaces = [
  { binding = "SETTINGS", id = "xxx" }
]
```

## Desktop Apps (Master, Touch, MoneyTrash)

### Tauri Build Optimizations

#### 1. Build Caching

```yaml
# Cache Tauri target directory for faster rebuilds
- name: Cache Tauri Build
  uses: actions/cache@v4
  with:
    path: |
      ~/.cargo/registry
      ~/.cargo/git
      apps/moneytrash/src-tauri/target
    key: ${{ runner.os }}-tauri-${{ hashFiles('apps/moneytrash/src-tauri/Cargo.lock') }}
    restore-keys: |
      ${{ runner.os }}-tauri-
```

#### 2. Windows-Specific Optimizations

```yaml
# Use Windows Server with better caching
runs-on: windows-2022

# Enable long paths
- name: Enable Long Paths
  run: git config --global core.longpaths true
```

#### 3. Multi-Platform Build Matrix

```yaml
build-desktop:
  strategy:
    matrix:
      include:
        - app: master
          os: windows-latest
        - app: touch
          os: windows-latest
        - app: moneytrash
          os: [windows-latest, ubuntu-latest]
    fail-fast: false
```

### Tauri Configuration

```json
{
  "build": {
    "devtools": true,
    "updater": {
      "pubkey": "...",
      "endpoints": ["https://releases.clickflash.com/{{target}}/{{arch}}/{{current_version}}"]
    }
  },
  "bundle": {
    "windows": {
      "wix": {
        "language": "en-US"
      }
    }
  }
}
```

## Delta Updates for Touch App

### Implementation Strategy

1. **Build Version Manifest**
```json
{
  "version": "1.2.3",
  "build": "456",
  "minDeltaVersion": "1.2.0",
  "files": {
    "app.asar": {
      "size": 45000000,
      "hash": "sha256:abc123..."
    }
  }
}
```

2. **Delta Generation Script**
```bash
#!/bin/bash
# Generate delta between versions
npm run tauri build -- --no-bundle
node scripts/generate-delta.js --from=1.2.0 --to=1.2.3
```

3. **Update Server Endpoint**
```
GET /updates/touch/{{version}}/delta/{{minVersion}}
```

### CI Integration

```yaml
- name: Generate Delta Updates
  if: github.ref_type == 'tag'
  run: |
    npm run build:touch:delta
  env:
    DELTA_SERVER_URL: ${{ secrets.DELTA_SERVER_URL }}
```

## Build Performance Metrics

| App | Cold Build | Warm Build | Delta Build |
|-----|-----------|------------|-------------|
| Master | ~8 min | ~3 min | N/A |
| Touch | ~6 min | ~2 min | ~30 sec |
| MoneyTrash | ~10 min | ~4 min | N/A |
| Management | ~3 min | ~1 min | N/A |
| Gallery | ~3 min | ~1 min | N/A |
| Website | ~2 min | ~30 sec | N/A |

## Caching Strategy Summary

### Node Modules
```yaml
- uses: actions/cache@v4
  with:
    path: node_modules
    key: ${{ runner.os }}-npm-${{ hashFiles('package-lock.json') }}
```

### Rust Dependencies
```yaml
- uses: swatinem/rust-cache@v2
  with:
    workspaces: apps/moneytrash/src-tauri
```

### Electron Cache
```yaml
- uses: actions/cache@v4
  with:
    path: ${{ env.ELECTRON_CACHE }}
    key: ${{ runner.os }}-electron-${{ hashFiles('package-lock.json') }}
```

## Artifact Retention

```yaml
- name: Clean Up Artifacts
  run: |
    # Keep only last 5 releases
    gh release delete -y $(gh release list --limit 10 | tail -n +6 | cut -f1) || true
```

## Security Considerations

1. **Secret Scanning**: All secrets stored in GitHub Actions secrets
2. **Code Signing**: Windows code signing for executables
3. **SBOM Generation**: Generate Software Bill of Materials
4. **Dependency Scanning**: Dependabot and Snyk integration

## Deployment Checklist

- [ ] Tests passing
- [ ] Build successful
- [ ] Artifacts uploaded
- [ ] Release notes generated
- [ ] Delta updates computed (if applicable)
- [ ] Notifications sent to Slack/Discord
- [ ] Monitoring dashboards updated
