# Error Response Standard

**Version:** 1.0  
**Date:** 2026-04-08  
**Status:** Implemented  

---

## 1. Overview

All ClickFlash APIs return errors in a standardized format.

---

## 2. Error Response Format

```typescript
interface ErrorResponse {
  error: {
    code: string;        // Machine-readable error code
    message: string;      // Human-readable message
    details?: object;    // Additional context (optional)
    requestId?: string;  // For support/debugging
    timestamp?: string;    // ISO 8601 timestamp
    docsUrl?: string;     // Link to documentation
  };
}
```

---

## 3. HTTP Status Codes

| Status | Meaning | When to Use |
|--------|---------|-------------|
| 400 | Bad Request | Invalid parameters, malformed JSON |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Authenticated but not authorized |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | State conflict (e.g., duplicate) |
| 422 | Unprocessable | Validation failed |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Error | Server error |
| 503 | Service Unavailable | Maintenance/downtime |

---

## 4. Error Code Reference

### Authentication Errors (AUTH_*)

| Code | HTTP Status | Description |
|------|------------|-------------|
| AUTH_MISSING | 401 | No authentication provided |
| AUTH_INVALID | 401 | Invalid credentials |
| AUTH_EXPIRED | 401 | Token expired |
| AUTH_INSUFFICIENT | 403 | Not authorized for this action |

### Validation Errors (VALIDATION_*)

| Code | HTTP Status | Description |
|------|------------|-------------|
| VALIDATION_REQUIRED | 400 | Required field missing |
| VALIDATION_INVALID | 400 | Field value invalid |
| VALIDATION_FORMAT | 400 | Wrong format |
| VALIDATION_SIZE | 400 | Value too large/small |

### Resource Errors (RESOURCE_*)

| Code | HTTP Status | Description |
|------|------------|-------------|
| RESOURCE_NOT_FOUND | 404 | Resource doesn't exist |
| RESOURCE_CONFLICT | 409 | Resource already exists |
| RESOURCE_DELETED | 410 | Resource was deleted |

### Rate Limit Errors (RATE_*)

| Code | HTTP Status | Description |
|------|------------|-------------|
| RATE_LIMIT_EXCEEDED | 429 | Too many requests |
| RATE_LIMIT_RETRY_AFTER | 429 | Retry after X seconds |

---

## 5. Example Responses

### Validation Error
```json
{
  "error": {
    "code": "VALIDATION_REQUIRED",
    "message": "The 'email' field is required",
    "details": {
      "field": "email",
      "constraint": "required"
    },
    "requestId": "req_abc123",
    "timestamp": "2026-04-08T12:00:00Z",
    "docsUrl": "https://docs.clickflash.com/errors/VALIDATION_REQUIRED"
  }
}
```

### Authentication Error
```json
{
  "error": {
    "code": "AUTH_EXPIRED",
    "message": "Your session has expired. Please log in again.",
    "requestId": "req_xyz789",
    "timestamp": "2026-04-08T12:00:00Z"
  }
}
```

### Server Error
```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred. Our team has been notified.",
    "requestId": "req_def456",
    "timestamp": "2026-04-08T12:00:00Z"
  }
}
```

---

## 6. Implementation

```typescript
// Example middleware
function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  const requestId = req.headers['x-request-id'] || crypto.randomUUID();
  
  if (err instanceof ValidationError) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: err.message,
        details: err.details,
        requestId,
        timestamp: new Date().toISOString(),
        docsUrl: 'https://docs.clickflash.com/errors'
      }
    });
  }
  
  // ... other error types
}
```

---

**Owner:** API Team  
**Enforced From:** 2026-04-08
