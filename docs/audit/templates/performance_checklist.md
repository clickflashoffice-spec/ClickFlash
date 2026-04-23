# Performance & Reliability Checklist

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
| P1 | SLA/SLO Targets: Documented targets for availability, latency | 10 | Doc review | SLA documentation | | |
| P2 | Resilience Patterns: Retry, timeout, fallback patterns implemented | 8 | Code review | Retry logic, timeout configs | | |
| P3 | MTTR: Mean time to recovery documented and tested | 8 | Drill documentation | Recovery runbooks | | |
| P4 | Health Checks: /health endpoints functional and monitored | 6 | Endpoint testing | Health route code | | |
| P5 | Graceful Degradation: App works when non-critical services fail | 6 | Failure injection | Feature flags, fallback UI | | |
| P6 | Database Performance: Queries optimized with indexes | 5 | Query analysis | Query execution plans | | |
| P7 | Caching Strategy: Appropriate caching for static/dynamic data | 5 | Config + code review | Cache headers, Redis (if used) | | |
| P8 | Resource Limits: CPU/memory limits enforced in containers | 4 | Config review | Docker resource limits | | |

## SLA/SLO Targets

| Metric | Target | Current | Status |
| :--- | :--- | :--- | :--- |
| Availability | | | |
| API Latency (p95) | | | |
| API Latency (p99) | | | |
| Error Rate | | | |
| Recovery Time (MTTR) | | | |

## Resilience Patterns

| Pattern | Implementation | Location | Status |
| :--- | :--- | :--- | :--- |
| Retry Logic | | | |
| Timeout Handling | | | |
| Fallback UI | | | |
| Circuit Breaker | | | |
| Bulkhead | | | |

## Health Check Endpoints

| Endpoint | Method | Returns | Monitoring | Status |
| :--- | :--- | :--- | :--- | :--- |
| /api/health | GET | Status | | |
| /api/system | GET | System Info | | |

## Database Performance

| Query | Index Used | Execution Time | Optimization Needed |
| :--- | :--- | :--- | :--- |

## Sign-off

| Role | Name | Date | Signature |
| :--- | :--- | :--- | :--- |
| Auditor | | | |
| SRE Lead | | | |

---

*End of Checklist*
