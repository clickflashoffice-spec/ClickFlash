# Deprecation Policy

**Version:** 1.0  
**Date:** 2026-04-08  
**Status:** Implemented  

---

## 1. Overview

This policy defines how ClickFlash deprecates features, APIs, and functionality while maintaining backward compatibility and clear communication.

---

## 2. Deprecation Tiers

| Tier | Timeline | Communication | Impact |
|------|----------|--------------|--------|
| **Minor** | 30 days notice | Release notes | Low - alternative available |
| **Major** | 90 days notice | Email + In-app notice | Medium - behavior change |
| **Critical** | 14 days notice | Urgent communication | High - breaking change |

---

## 3. Deprecation Process

### 3.1 Decision

- [ ] Identify feature to deprecate
- [ ] Assess impact on users
- [ ] Assign deprecation tier
- [ ] Create tracking issue

### 3.2 Communication

- [ ] Update documentation with deprecation notice
- [ ] Add warning in code (console warning)
- [ ] Publish release notes
- [ ] Notify affected users (email/in-app)
- [ ] Update API changelog

### 3.3 Sunset

- [ ] Remove feature from documentation
- [ ] Disable feature (may show error)
- [ ] Remove feature code (after grace period)
- [ ] Update version number

---

## 4. Deprecation Notice Format

```typescript
/**
 * @deprecated since version X.Y.Z
 * @deprecatedReason: [Brief reason]
 * @deprecatedAlternative: [Use this instead]
 * Removal date: YYYY-MM-DD
 */
```

---

## 5. API Deprecation

### 5.1 Response Headers

```
Deprecation: true
Sunset: Sat, 31 Dec 2026 23:59:59 GMT
Link: <https://api.clickflash.com/docs/v2>; rel="deprecation"
Successor-API: https://api.clickflash.com/v3
```

### 5.2 Changelog Format

```markdown
## v4.2.0 (2026-04-08)

### Deprecations

| Feature | Deprecated | Sunset | Alternative |
|---------|-----------|--------|-------------|
| /api/v1/orders | 2026-01-08 | 2026-04-08 | /api/v2/orders |
```

---

## 6. User Communication Templates

### In-App Notice

```
⚠️ Feature Deprecated

[Feature Name] will be removed on [Date].

[What to use instead]

[Learn more](link)
```

### Email Template

```
Subject: Action Required: [Feature] Deprecation Notice

Dear [User],

We are deprecating [Feature] on [Date].

[Why we're deprecating it]
[What to use instead]
[How to migrate]

If you have questions, contact [Support].
```

---

## 7. Grace Period

| Tier | Grace Period |
|------|-------------|
| Minor | 30 days |
| Major | 90 days |
| Critical | 14 days |

---

**Owner:** Product Team  
**Review:** Quarterly
