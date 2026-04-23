# Evidence Template

**Evidence ID:** EVD-[DOMAIN]-[###]  
**Date Collected:** YYYY-MM-DD  
**Collected By:** [Name]  
**Source:** [File/System/Location]  
**App:** [App Name]  

---

## 1. Evidence Metadata

| Attribute | Value |
|-----------|-------|
| Evidence Type | [Screenshot/Config Dump/Code Snippet/Log/Network Trace] |
| Source Path | [Path to source] |
| Collection Method | [Manual/Automated] |
| Hash (SHA-256) | [Hash value] |
| Timestamp | [Collection timestamp] |

---

## 2. Evidence Description

[Description of what this evidence shows]

---

## 3. Relevance to Findings

| Finding ID | Relationship |
|------------|--------------|
| F-XXX-001 | [Supports/Contradicts] |
| F-XXX-002 | [Supports/Contradicts] |

---

## 4. Evidence Content

### 4.1 Screenshots

[For screenshots - include annotations if applicable]

### 4.2 Config Dumps

```
[Sanitized configuration content]
```

### 4.3 Code Snippets

```[language]
[Code snippet - max 50 lines]
```

### 4.4 Log Entries

```
[Relevant log entries - first 100 lines]
```

---

## 5. Sanitization Log

| Field | Original | Sanitized | Method |
|-------|----------|-----------|--------|
| [Field 1] | [Original] | [REDACTED] | [Method] |
| [Field 2] | [Original] | [REDACTED] | [Method] |

---

## 6. Chain of Custody

| Date | Time | Action | Custodian | Notes |
|------|------|--------|-----------|-------|
| YYYY-MM-DD | HH:MM | Collection | [Name] | Initial collection |
| YYYY-MM-DD | HH:MM | Storage | [Name] | Uploaded to secure storage |
| YYYY-MM-DD | HH:MM | Access | [Name] | Accessed for review |

---

## 7. Validation

| Check | Status |
|-------|--------|
| Evidence authentic | [Verified/Unverified] |
| No PII present | [Verified/Failed - see sanitization] |
| Timestamp accurate | [Verified/Unverified] |
| Hash matches file | [Verified/Unverified] |

---

## 8. Associated Findings

[List of findings this evidence supports]

---

**Document Control:**
- Version: 1.0
- Classification: Internal - Audit Evidence
