# Global Readiness Audit

## Overview

This document outlines the global readiness assessment for ClickFlash ecosystem deployment, covering timezone handling, Web Application Firewall (WAF) configuration, and bot management.

## Timezone Handling

### Server-Side Timezone Management

```typescript
// All dates stored in UTC
const timestamp = new Date().toISOString(); // "2026-03-31T10:00:00.000Z"

// Display dates in user's local timezone
export function formatLocalDate(utcDate: string, locale: string = 'en-US'): string {
    return new Date(utcDate).toLocaleString(locale, {
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}
```

### Database Timezone Configuration

```sql
-- All timestamp columns should be TIMESTAMPTZ (PostgreSQL)
CREATE TABLE orders (
    id UUID PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    event_date DATE,  -- Local event date (stored without timezone)
    expires_at TIMESTAMPTZ  -- Expiration in UTC
);
```

### API Response Format

```typescript
interface ApiResponse<T> {
    data: T;
    meta: {
        timestamp: string;        // ISO 8601 UTC
        timezone: string;         // Server timezone
        locale: string;          // Client locale
        serverTime: number;      // Unix timestamp for client sync
    };
}
```

### Event Scheduling Across Timezones

```typescript
// Use UTC for all scheduling
interface ScheduledEvent {
    id: string;
    event_name: string;
    event_date: string;          // "2026-04-15"
    event_time: string;           // "18:00:00"
    timezone: string;             // "America/New_York"
    starts_at: string;            // Computed UTC timestamp
    ends_at: string;              // Computed UTC timestamp
}

// Convert local time to UTC for storage
function toUTC(localDate: string, localTime: string, tz: string): string {
    const [year, month, day] = localDate.split('-').map(Number);
    const [hour, minute, second] = localTime.split(':').map(Number);
    return new Date(Date.UTC(year, month - 1, day, hour, minute, second))
        .toISOString();
}
```

## Web Application Firewall (WAF) Configuration

### Cloudflare WAF Rules

#### Rate Limiting

```yaml
# Rate limit rule for API endpoints
- name: api-rate-limit
  expression: |
    (http.request.uri.path matches "^/api/") and
    (cf.threat_score > 10)
  actions:
    rate_limit:
      requests_per_period: 100
      period: 60
      mitigation_timeout: 300

# Challenge suspicious requests
- name: block-known-bots
  expression: |
    (cf.threat_score > 30) or
    (ip.src in $blocklist)
  actions:
    challenge: true
```

#### Bot Management

```yaml
# Configure bot fight mode
- name: bot-detection
  expression: |
    (cf.bot_management.verified_bot) or
    (cf.bot_management.static_resource)
  actions:
    serve_error: false

# Challenge JavaScript challenges for suspicious
- name: challenge-suspicious
  expression: |
    (http.request.headers["user-agent"] contains "curl") or
    (http.request.headers["user-agent"] contains "python")
  actions:
    challenge: true
```

### Recommended WAF Rules for ClickFlash

```yaml
# Block access to admin endpoints from non-admin IPs
- name: protect-admin
  path: /api/admin/*
  action: block
  expression: |
    not (ip.src in $admin_ips)

# Rate limit photo uploads
- name: upload-rate-limit
  path: /api/upload/*
  actions:
    rate_limit:
      requests_per_period: 10
      period: 60

# Require authentication for sensitive endpoints
- name: protect-orders
  path: /api/orders/*
  action: allow
  expression: |
    http.request.headers["authorization"] exists

# Block SQL injection attempts
- name: block-sql-injection
  action: block
  expression: |
    (http.request.uri.query contains "1=1") or
    (http.request.uri.query contains "UNION SELECT")
```

### DDoS Protection

```yaml
# Configure DDoS protection sensitivity
- name: ddos-protection
  mode: proactive
  sensitivity: medium

# Automatic challenge for high threat scores
- name: auto-challenge
  action: challenge
  expression: |
    cf.threat_score > 15
```

## Bot Management

### Verified Bots (Allow List)

| Bot | User Agent | Purpose |
|-----|------------|---------|
| Googlebot | Googlebot/2.1 | SEO indexing |
| Bingbot | bingbot/2.0 | SEO indexing |
| Facebook | facebookexternalhit | Social sharing |
| Twitter | Twitterbot | Social sharing |

### Bot Detection Strategies

```typescript
interface BotDetectionResult {
    isBot: boolean;
    confidence: number;
    botType?: 'search' | 'social' | 'monitoring' | 'malicious';
}

// Heuristic bot detection
export function detectBot(userAgent: string, headers: Record<string, string>): BotDetectionResult {
    const ua = userAgent.toLowerCase();
    
    // Known bots
    if (ua.includes('googlebot')) return { isBot: true, confidence: 100, botType: 'search' };
    if (ua.includes('bingbot')) return { isBot: true, confidence: 100, botType: 'search' };
    if (ua.includes('facebook')) return { isBot: true, confidence: 100, botType: 'social' };
    if (ua.includes('twitterbot')) return { isBot: true, confidence: 100, botType: 'social' };
    
    // Suspicious patterns
    if (ua.includes('curl') || ua.includes('wget')) {
        return { isBot: true, confidence: 90, botType: 'malicious' };
    }
    
    if (ua.includes('python') || ua.includes('scrapy')) {
        return { isBot: true, confidence: 85, botType: 'malicious' };
    }
    
    // Missing User-Agent
    if (!userAgent || userAgent.trim() === '') {
        return { isBot: true, confidence: 70, botType: 'malicious' };
    }
    
    return { isBot: false, confidence: 0 };
}
```

### Honeypot Protection

```html
<!-- Hidden form field for bots -->
<input 
    type="text" 
    name="website" 
    id="website-input"
    style="position: absolute; left: -9999px; opacity: 0;"
    tabindex="-1"
    autocomplete="off"
/>

<!-- Check in form handler -->
if (formData.website) {
    // Bot detected - silently reject
    return { success: false, error: 'Invalid submission' };
}
```

## Geographic Restrictions

### IP-Based Country Blocking

```typescript
interface GeoRestriction {
    enabled: boolean;
    allowedCountries: string[];  // ISO 3166-1 alpha-2
    blockedCountries: string[];
}

// Cloudflare Worker for geo-blocking
export async function handleGeoRestriction(request: Request): Promise<Response> {
    const country = request.cf?.country;
    
    if (!country) {
        return new Response('Access denied', { status: 403 });
    }
    
    const config = getGeoConfig();
    
    if (config.enabled) {
        if (config.blockedCountries.includes(country)) {
            return new Response('Service not available in your region', { status: 451 });
        }
        
        if (config.allowedCountries.length > 0 && !config.allowedCountries.includes(country)) {
            return new Response('Access denied', { status: 403 });
        }
    }
    
    return fetch(request);
}
```

### GDPR Compliance

```typescript
interface GDPRConfig {
    requireConsent: boolean;
    allowedRegions: string[];
    dataRetention: {
        photos: number;    // days
        orders: number;   // days
        analytics: number; // days
    };
}

const GDPR_REGIONS = ['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE'];

export function requiresGDPR(country: string): boolean {
    return GDPR_REGIONS.includes(country);
}
```

## Monitoring & Alerting

### Global Health Checks

```yaml
# Health check endpoints
- name: api-health
  path: /api/health
  interval: 30s
  timeout: 5s
  alert_on_degradation: true

- name: database-health  
  path: /api/health/db
  interval: 60s
  timeout: 3s
  alert_on_failure: true

- name: storage-health
  path: /api/health/storage
  interval: 300s
  timeout: 10s
```

### Alert Thresholds

| Metric | Warning | Critical | Action |
|--------|---------|----------|--------|
| API Latency (p99) | >500ms | >2000ms | Scale horizontally |
| Error Rate | >1% | >5% | Page on-call |
| CPU Usage | >70% | >90% | Scale up |
| Memory Usage | >80% | >95% | Scale up |
| Disk Usage | >70% | >85% | Clean up logs |
| Request Rate | >10000 RPS | >20000 RPS | Rate limit |

### Incident Response

```typescript
interface Incident {
    id: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    status: 'investigating' | 'identified' | 'resolved';
    affectedServices: string[];
    startedAt: Date;
    resolvedAt?: Date;
    timeline: Array<{
        timestamp: Date;
        action: string;
        notes: string;
    }>;
}
```

## Readiness Checklist

### Pre-Deployment

- [ ] All WAF rules configured and tested
- [ ] Rate limiting enabled on all API endpoints
- [ ] Bot management configured
- [ ] Timezone handling verified in all date displays
- [ ] GDPR compliance checked for EU deployments
- [ ] Geo-restrictions configured if needed
- [ ] Health check endpoints responding
- [ ] Monitoring dashboards configured
- [ ] Alert thresholds set
- [ ] Incident response plan documented

### Post-Deployment

- [ ] Verify WAF rules are blocking test attacks
- [ ] Confirm rate limiting is working
- [ ] Check bot detection is functioning
- [ ] Test timezone conversions across regions
- [ ] Verify health checks in monitoring
- [ ] Test alert notifications
- [ ] Confirm CDN caching working
- [ ] Validate SSL certificates
- [ ] Check backup procedures
- [ ] Test disaster recovery plan

## Regional Considerations

### North America
- Primary region: us-east-1
- Compliance: SOC 2, PCI-DSS (for payments)
- Data residency: US only (configurable)

### Europe
- Primary region: eu-west-1
- Compliance: GDPR, SOC 2
- Data residency: EU only (configurable)

### Asia Pacific
- Primary region: ap-southeast-1
- Compliance: PDPA, SOC 2
- Data residency: Singapore/Australia

## Security Headers

```typescript
const securityHeaders = {
    'Content-Security-Policy': "default-src 'self'; img-src 'self' https://picsum.photos https://*.cloudflare.com; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';",
    'X-Frame-Options': 'SAMEORIGIN',
    'X-Content-Type-Options': 'nosniff',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(self), geolocation=()',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
};
```
