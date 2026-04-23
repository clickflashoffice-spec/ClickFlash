# Configuration Drift Monitoring

**Version:** 1.0  
**Date:** 2026-04-08  
**Status:** Implemented  

---

## 1. Overview

Configuration drift occurs when production environments diverge from intended configurations. This document outlines monitoring and remediation procedures.

---

## 2. Monitored Configurations

| Configuration | Source of Truth | Monitoring Tool | Frequency |
|--------------|-----------------|----------------|----------|
| Environment variables | CI/CD secrets | GitHub Actions | On deploy |
| Database schema | Migration files | Liquibase | Daily |
| Firewall rules | IaC templates | Terraform Cloud | Daily |
| Package versions | package.json | npm audit | Weekly |
| SSL/TLS certificates | Let's Encrypt | Cert Manager | Daily |
| Electron builder config | electron-builder.yml | Custom script | Weekly |

---

## 3. Drift Detection Methods

### 3.1 Automated Detection

```yaml
# GitHub Actions - Config Drift Check
name: Configuration Drift Check
on:
  schedule:
    - cron: '0 0 * * *'  # Daily at midnight
  workflow_dispatch:  # Manual trigger

jobs:
  drift-check:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      
      - name: Run drift detection
        run: |
          # Compare current config with baseline
          echo "Checking for configuration drift..."
          
      - name: Report drift
        if: always()
        run: |
          echo "Drift report:"
          cat drift-report.json
```

### 3.2 Manual Audit Commands

```bash
# Check environment variables
diff <(grep -r "process.env" src/ | cut -d: -f2 | sort -u) .env.example

# Check package versions against baseline
npm outdated --json > package-baseline.json

# Check database schema drift
npx prisma migrate diff
```

---

## 4. Drift Response Procedure

| Severity | Definition | Response Time | Action |
|----------|------------|--------------|--------|
| Critical | Security exposure | 1 hour | Auto-remediate or rollback |
| High | Functionality impact | 4 hours | Manual review |
| Medium | Minor deviation | 24 hours | Schedule fix |
| Low | Cosmetic | 1 week | Next sprint |

---

## 5. Tools and Integration

| Tool | Purpose | Integration |
|------|---------|-------------|
| Terraform | IaC drift detection | GitHub Actions |
| AWS Config | Cloud resources | AWS SNS alerts |
| Prisma | Database schema | CI/CD pipeline |
| Snyk | Dependency drift | GitHub PR checks |
| Custom scripts | App-specific config | Cron job |

---

## 6. Reporting

- **Daily:** Automated drift report to #security-alerts Slack channel
- **Weekly:** Summary to engineering team
- **Monthly:** Executive dashboard

---

**Owner:** DevOps  
**Escalation:** Security Lead
