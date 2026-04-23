# Incident Response Plan

**Version:** 1.0  
**Date:** 2026-04-08  
**Status:** Implemented  

---

## 1. Overview

This incident response plan defines procedures for detecting, responding to, and recovering from security incidents.

---

## 2. Severity Levels

| Severity | Definition | Examples | Response Time | Escalation |
|----------|------------|---------|--------------|------------|
| SEV1 | Critical - Full service down | Data breach, complete outage | 15 minutes | Immediate |
| SEV2 | High - Major functionality impaired | Payment processing failure | 30 minutes | 1 hour |
| SEV3 | Medium - Minor functionality impacted | Single feature degraded | 2 hours | 4 hours |
| SEV4 | Low - Minimal impact | UI glitch, cosmetic issue | 24 hours | Next business day |

---

## 3. Incident Response Team

| Role | Responsibilities | Contact |
|------|------------------|---------|
| Incident Commander | Coordinates response, makes decisions | On-call rotation |
| Security Lead | Security-specific guidance | Pagerduty |
| Engineering Lead | Technical remediation | On-call rotation |
| Communications Lead | Stakeholder updates | PR/Comms team |
| Documentation Lead | Incident logging | Incident commander |

---

## 4. Incident Response Procedure

### 4.1 Detection & Triage (0-15 minutes)

- [ ] Acknowledge incident in PagerDuty
- [ ] Assess severity (SEV1-4)
- [ ] Create incident channel (#incident-YYYY-MM-DD)
- [ ] Assign incident commander
- [ ] Notify stakeholders (SEV1/SEV2)

### 4.2 Containment (15-60 minutes)

- [ ] Identify affected systems
- [ ] Isolate affected components
- [ ] Preserve evidence
- [ ] Implement temporary fixes
- [ ] Communicate status

### 4.3 Eradication (1-4 hours)

- [ ] Root cause analysis
- [ ] Remove threat/issue
- [ ] Patch vulnerabilities
- [ ] Verify no remaining impact

### 4.4 Recovery (4-24 hours)

- [ ] Restore services
- [ ] Verify functionality
- [ ] Monitor for recurrence
- [ ] Update stakeholders

### 4.5 Post-Incident (24-72 hours)

- [ ] Document timeline
- [ ] Identify lessons learned
- [ ] Update runbooks
- [ ] Schedule post-mortem

---

## 5. Communication Templates

### 5.1 Initial Notification (SEV1/SEV2)

```
⚠️ [SEV1] Incident Declared - [Brief Title]
Affected Service: [Service Name]
Status: Investigating
Impact: [User impact description]
Next Update: [Time]
```

### 5.2 Status Update

```
📋 Incident Update - [Time]
Status: [Investigating/Identified/Fixing/Resolved]
Progress: [What we've done]
Next Steps: [What's happening next]
ETA: [Estimated resolution time]
```

### 5.3 Resolution

```
✅ Incident Resolved - [Title]
Duration: [X hours Y minutes]
Root Cause: [Brief description]
Affected: [Services/data impacted]
Fix Applied: [What was done]
```

---

## 6. Breach Notification

### GDPR (72-hour requirement)

If personal data breach:
1. Document breach details
2. Notify supervisory authority within 72 hours
3. Document decision on user notification
4. If high risk to users: notify affected individuals

### CCPA

If breach affecting 500+ California residents:
1. Notify attorney general
2. Notify affected individuals

---

## 7. Post-Incident Review

| Section | Content |
|---------|---------|
| Timeline | Minute-by-minute events |
| Root Cause | What caused the incident |
| Impact | Users/systems affected |
| Response | What was done well |
| Improvements | What could be better |
| Action Items | Specific remediations |

---

## 8. Contacts

| Role | Primary | Backup |
|------|---------|--------|
| Security On-Call | PagerDuty | |
| Engineering On-Call | PagerDuty | |
| Executive On-Call | PagerDuty | |

---

**Last Tested:** 2026-04-08  
**Next Test:** 2026-07-08
