# Automated Security Scanning Configuration

## CI/CD Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/security-scan.yml
name: Security Scan

on:
  schedule:
    - cron: '0 0 * * 0'  # Weekly
  push:
    branches: [main, develop]

jobs:
  secret-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Scan for secrets
        uses: trufflesecurity/trufflehog@main
        with:
          path: .
          extra_args: --json --fail
  
  dependency-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Run npm audit
        run: npm audit --audit-level=high --json > audit-results.json
        
      - name: Upload audit results
        uses: actions/upload-artifact@v4
        with:
          name: npm-audit-results
          path: audit-results.json

  codeql-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Initialize CodeQL
        uses: github/codeql-action/init@v3
        with:
          languages: javascript, typescript
      
      - name: Perform CodeQL Analysis
        uses: github/codeql-action/analyze@v3

  container-scan:
    runs-on: ubuntu-latest
    if: contains(github.event.inputs, 'docker')
    steps:
      - uses: actions/checkout@v4
      
      - name: Build container
        run: docker build -t clickflash:latest .
        
      - name: Run Trivy
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: 'clickflash:latest'
          format: json
          output: 'trivy-results.json'
```

---

## Dependabot Configuration

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: 'npm'
    directory: '/'
    schedule:
      interval: 'weekly'
    open-pull-requests-limit: 10
    labels:
      - dependencies
      - security
    
  - package-ecosystem: 'github-actions'
    directory: '/'
    schedule:
      interval: 'weekly'
```

---

## Pre-Commit Hooks

```bash
# Install pre-commit hooks
pip install pre-commit

# .pre-commit-config.yaml
repos:
  - repo: https://github.com/gitleaks/gitleaks
    rev: v8.18.0
    hooks:
      - id: gitleaks

  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.5.0
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
      - id: check-yaml
      - id: check-added-large-files
```

---

## Secret Scanning Results

| Tool | Schedule | Status | Last Run |
| :--- | :--- | :--- | :--- |
| TruffleHog | Weekly + on push | Enabled | - |
| npm audit | On build | Enabled | - |
| CodeQL | Weekly | Enabled | - |
| Trivy | On build | Disabled | - |

---

## Alert Integration

| Tool | Channel | Severity | Action |
| :--- | :--- | :--- | :--- |
| TruffleHog | Slack + Email | Critical | Immediate |
| npm audit | Slack | High | Weekly review |
| CodeQL | Email | Medium | Monthly review |

---

*End of Security Scanning Configuration*
