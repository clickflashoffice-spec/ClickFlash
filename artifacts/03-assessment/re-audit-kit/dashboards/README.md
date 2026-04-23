# Grafana Dashboard Import Guide

## Prerequisites

1. **Grafana Instance** (v9.0+)
2. **Admin Access** to import dashboards
3. **Data Sources** configured:
   - Prometheus (for metrics)
   - Elasticsearch or Loki (for logs)
   - GitHub (for CI/CD data)

---

## Importing Dashboards

### Option 1: UI Import

1. **Open Grafana**
   ```
   https://your-grafana-instance.com
   ```

2. **Navigate to Dashboards**
   - Click **Dashboards** (left sidebar)
   - Click **+ Import**

3. **Upload JSON**
   - Click **Upload JSON file**
   - Select one of:
     - `executive-dashboard.json`
     - `technical-dashboard.json`

4. **Configure**
   - Select data source for each panel
   - Click **Import**

### Option 2: API Import

```bash
# Import via curl
curl -X POST \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d @executive-dashboard.json \
  https://your-grafana-instance.com/api/dashboards/db

# Or use grafana-cli
grafana-cli dashboards import executive-dashboard.json
```

---

## Dashboard Specifications

### Executive Dashboard

**File:** `executive-dashboard.json`

**Purpose:** Leadership view of ecosystem health

**Panels:**

| Panel | Type | Data Source | Refresh |
|-------|------|------------|---------|
| Overall Health Score | Stat | Prometheus | 5 min |
| Open Findings by Severity | Bar Gauge | Prometheus | 5 min |
| Remediation Progress | Progress | Prometheus | 5 min |
| Compliance Status | Gauge | Prometheus | 1 hour |
| Days Since Last Incident | Stat | Prometheus | 1 day |
| Critical Vulnerabilities | Time Series | Prometheus | 5 min |
| Build Success Rate | Time Series | GitHub API | 1 hour |
| Error Rate by App | Bar Gauge | Logs | 5 min |

**Variables:**
- `apps`: master, touch, moneytrash, management, gallery, website, master-cpp
- `severity`: critical, high, medium, low

---

### Technical Dashboard

**File:** `technical-dashboard.json`

**Purpose:** Engineering view of system metrics

**Panels:**

| Panel | Type | Data Source | Refresh |
|-------|------|------------|---------|
| Build Success Rate | Time Series | GitHub API | 1 min |
| Test Coverage Trend | Time Series | Jest JSON | 1 hour |
| Vulnerability Count | Time Series | SonarQube | 1 day |
| Dependency Age | Bar Gauge | npm audit | 1 day |
| API Latency p95 | Time Series | Logs/APM | 1 min |
| API Latency p99 | Time Series | Logs/APM | 1 min |
| Error Rate by App | Time Series | Logs | 1 min |
| Outdated Packages | Table | npm audit | 1 day |
| MTTR (Hours) | Stat | PagerDuty | 1 hour |
| Secrets Detected | Time Series | TruffleHog | 1 day |
| Layer Coverage | Bar Gauge | Manual | 1 week |

---

## Required Metrics

### Prometheus Metrics

Add to your Prometheus `scrape_configs`:

```yaml
scrape_configs:
  # ClickFlash metrics endpoint (add to each app)
  - job_name: 'clickflash-metrics'
    static_configs:
      - targets:
          - 'master:8090'
          - 'touch:8091'
          - 'gallery:8093'
    metrics_path: '/api/metrics'
```

### Metric Format

```
# Health score
clickflash_health_score{app="master"} 75

# Findings by severity
clickflash_findings_severity{app="master",severity="critical"} 0
clickflash_findings_severity{app="master",severity="high"} 4

# Build success
clickflash_build_success_rate{app="master"} 94

# Test coverage
clickflash_test_coverage{app="master"} 78

# Vulnerabilities
clickflash_vulnerabilities{app="master",severity="critical"} 0
clickflash_vulnerabilities{app="master",severity="high"} 3

# Error rate
clickflash_error_rate{app="master"} 0.5

# API latency (ms)
clickflash_api_latency_p95{app="master"} 245
clickflash_api_latency_p99{app="master"} 480

# Secrets detected (cumulative)
clickflash_secrets_detected_total 4

# Layer coverage (percentage)
clickflash_layer_coverage{layer="frontend",app="master"} 100
clickflash_layer_coverage{layer="backend",app="master"} 100

# Dependency age (days)
clickflash_dependency_age_days{app="master"} 45

# MTTR (hours)
clickflash_mttr_hours 2.5

# Compliance scores
clickflash_gdpr_score 70
clickflash_ccpa_score 65

# Days since incident
clickflash_days_since_incident 15
```

---

## Alert Configuration

### PagerDuty Alerts (Critical)

```yaml
# Critical vulnerabilities
- alert: ClickFlashCriticalVulnerabilities
  expr: sum(clickflash_vulnerabilities{severity="critical"}) > 0
  for: 5m
  labels:
    severity: critical
    team: security
  annotations:
    summary: "ClickFlash has critical vulnerabilities"
    runbook: "https://wiki.clickflash.com/runbooks/vulnerability"

# Secrets detected
- alert: ClickFlashSecretsDetected
  expr: clickflash_secrets_detected_total > 0
  for: 0m
  labels:
    severity: critical
    team: security
```

### Slack Alerts (High)

```yaml
# High vulnerabilities
- alert: ClickFlashHighVulnerabilities
  expr: sum(clickflash_vulnerabilities{severity="high"}) > 5
  for: 1h
  labels:
    severity: high
    team: security
  annotations:
    summary: "ClickFlash has high vulnerabilities"
    slack_channel: "#security-alerts"
```

---

## Dashboard Sharing

1. **Make Public** (internal only)
   - Dashboard Settings → Permissions → Public

2. **Share with Team**
   - Dashboard Settings → Permissions → Add permission

3. **Export**
   - Dashboard Settings → JSON → Download

---

## Maintenance

### Quarterly Tasks

1. Review threshold values in `thresholds.yaml`
2. Update metric queries if schema changes
3. Add new apps to variable lists
4. Archive old dashboards

### Alert Tuning

1. Review false positives monthly
2. Adjust thresholds based on baseline
3. Update runbook links

---

## Files Reference

```
re-audit-kit/dashboards/
├── executive-dashboard.json    # Leadership view
├── technical-dashboard.json    # Engineering view
├── README.md                  # This file
└── METRICS.md                 # Metric definitions
```

---

*For questions: Contact DevOps Team*