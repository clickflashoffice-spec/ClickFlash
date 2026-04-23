# Observability & Monitoring Checklist

## Assessment Information
| Field | Value |
| :--- | :--- |
| App | [App Name] |
| Assessment Date | [Date] |
| Auditor | [Name] |
| Overall Score | [X/100] |
| Rating | [Excellent/Good/Acceptable/Poor/Critical] |

## Assessment Criteria

| # | Criterion | Weight | Assessment Method | Evidence Source | Score | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| O1 | Structured Logging: Consistent log format across apps | 10 | Code review | Logger implementation | | |
| O2 | Log Levels: Appropriate levels (debug, info, warn, error) | 8 | Config review | Logger config | | |
| O3 | Metrics Export: Key metrics exposed (request rate, error rate, latency) | 8 | Config + code | Metrics endpoints | | |
| O4 | Tracing: Request tracing across service boundaries | 6 | Code review | Trace ID implementation | | |
| O5 | Alerting: Critical alerts configured and tested | 6 | Config review | Alert configurations | | |
| O6 | Dashboards: Operational dashboards available | 5 | Tool review | Dashboard screenshots | | |
| O7 | Log Retention: Retention policy documented and enforced | 4 | Config review | Log retention configs | | |

## Logger Implementation

| App | Logger Library | Format | Output | Status |
| :--- | :--- | :--- | :--- | :--- |
| Master Portal | | | | |
| Touch Kiosk | | | | |
| MoneyTrash | | | | |
| Management | | | | |
| Gallery | | | | |

## Log Level Standards

| Level | Usage | Enabled (Dev) | Enabled (Prod) |
| :--- | :--- | :--- | :--- |
| Debug | Development details | | |
| Info | General operations | | |
| Warn | Non-critical issues | | |
| Error | Errors with context | | |

## Metrics Collected

| Metric | Source | Export Method | Dashboard |
| :--- | :--- | :--- | :--- |
| Request Rate | | | |
| Error Rate | | | |
| Latency (p95) | | | |
| Latency (p99) | | | |
| CPU Usage | | | |
| Memory Usage | | | |

## Alert Configuration

| Alert | Condition | Action | Status |
| :--- | :--- | :--- | :--- |
| High Error Rate | > 5% | | |
| High Latency | > 2s | | |
| Service Down | | | |
| Disk Space Low | | | |

## Sign-off

| Role | Name | Date | Signature |
| :--- | :--- | :--- | :--- |
| Auditor | | | |
| SRE Lead | | | |

---

*End of Checklist*
