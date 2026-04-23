# API Versioning Strategy

**Version:** 1.0  
**Date:** 2026-04-08  
**Status:** Implemented  

---

## 1. Overview

This document defines the API versioning strategy for all ClickFlash APIs.

---

## 2. Versioning Scheme

### URL Path Versioning

```
/api/v1/resources     - Version 1 (deprecated)
/api/v2/resources   - Version 2 (current)
/api/v3/resources   - Version 3 (beta)
```

### Version Lifecycle

| State | Description | Timeline |
|-------|-------------|----------|
| Beta | New version, testing | 0-90 days |
| Current | Stable, recommended | Ongoing |
| Deprecated | Scheduled for removal | 90 days notice |
| Sunset | No longer available | After grace period |

---

## 3. Compatibility Rules

### 3.1 Breaking Changes (Require Major Version Bump)

- Removing endpoints
- Removing or renaming fields
- Changing field types
- Changing authentication requirements
- Modifying error response formats
- Changing required parameters

### 3.2 Non-Breaking Changes (Minor Version Bump)

- Adding new optional parameters
- Adding new response fields
- Adding new endpoints
- Fixing bugs that changed behavior
- Adding new enum values

---

## 4. Version Headers

### Request
```
Accept: application/json; version=2
```

### Response Headers
```
API-Version: 2
API-Deprecated: true
API-Sunset: Sat, 31 Dec 2026 23:59:59 GMT
```

---

## 5. Version Lifecycle Timeline

| Version | Release Date | Current | Deprecated | Sunset Date |
|---------|------------|---------|----------|-------------|
| v1 | 2024-01-01 | - | 2026-01-01 | 2026-04-01 |
| v2 | 2026-01-01 | Yes | - | - |
| v3 | 2026-04-01 | Beta | - | - |

---

## 6. Migration Guide

Each major version includes a migration guide in `/docs/migrations/`.

Example: `/docs/migrations/v1-to-v2.md`

---

## 7. Client Recommendations

- Always pin to a specific version in production
- Test against new versions before upgrading
- Subscribe to API changelog for deprecation notices
- Use the oldest supported version that meets your needs

---

**Owner:** API Team  
**Last Updated:** 2026-04-08
