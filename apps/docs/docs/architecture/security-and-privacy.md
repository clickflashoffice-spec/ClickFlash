---
sidebar_position: 4
title: Security & Privacy (GDPR)
description: Details regarding ecosystem security, GDPR data privacy, and telemetry architecture.
---

# Security & Data Privacy Architecture

This document details the Security Fortress, Telemetry, and GDPR Data Privacy mechanics implemented across the ClickFlash ecosystem.

## 1. Security Fortress

The ClickFlash ecosystem processes payments, handles Personally Identifiable Information (PII), and synchronizes data between isolated offline edge nodes (Touch Kiosks, Master Station) and the global Cloudflare Edge.

### Authentication & Sessions
- **Stateless Tokens**: The system utilizes stateless JWTs (JSON Web Tokens) to verify identity across the Cloudflare Workers. 
- **Session Storage**: In local environments (like the `management` app), sensitive authentication payloads and tokens are securely pinned to `sessionStorage` instead of `localStorage` or unencrypted cookies. This guarantees that cryptographic materials evaporate immediately upon tab closure, mitigating Cross-Site Scripting (XSS) persistence attacks.
- **Offline Node Pairing**: Local kiosks securely pair with the Master Station using zero-trust HMAC signatures, ensuring untrusted devices on the same local network cannot spoof kiosks or forge orders.

### API Security
- **Cloudflare Edge Protection**: Public-facing APIs are shielded by Cloudflare WAF and Rate Limiting logic.
- **CORS Hardening**: Strict Origin-checking is enforced. Unwhitelisted origins receive opaque rejections. Furthermore, internal 500 exceptions dynamically attach CORS headers to ensure the browser does not swallow the HTTP status code, preserving front-end observability without compromising security.

## 2. Telemetry & Observability

To maintain a zero-approximation monitoring environment across our decentralized infrastructure, we implemented a custom telemetry mesh.

### Telemetry Web Engine (`@clickflash/telemetry-web`)
A bespoke ingest wrapper handles front-end error reporting, tracking:
- **Caught/Uncaught Exceptions** (with auto-throttling to prevent spam)
- **React Boundary Errors** (component crash contexts)
- **Core Web Vitals** (LCP, FID, CLS)

The `@clickflash/telemetry-web` package aggregates these logs in memory and flushes them to the `management` ingest API via a non-blocking `Navigator.sendBeacon` fallback architecture.

## 3. GDPR Compliance & Data Privacy

As a photography business, we capture and retain images of individuals, order histories, and contact information. Strict adherence to GDPR (Europe) and CCPA (California) is embedded at the structural level.

### The Privacy Registry
The `MoneyTrashEmailMarketingService` operates a strict **Privacy Registry** (`unsubscribedEmails` Set). This structure sits at the lowest layer of the outbound email pipeline.

### Pre-Dispatch Interceptor
- Before any email (bulk or automated recovery) is dispatched via the `sendEmail` API, the recipient is checked against the Privacy Registry.
- If flagged, the execution is silently aborted, and an internal telemetry warning is fired. This architecture makes accidental spam structurally impossible.

### Article 17: Right to be Forgotten
Users can request immediate and permanent erasure of their data from our active marketing systems.
When the `rightToBeForgotten(email)` API is invoked:
1. The email is permanently added to the Privacy Registry (blocking future sends).
2. The system forcefully iterates over all historical communication arrays (e.g., `emailLogs`) and irreversibly strips any records containing the target PII.
3. A sanitized notification is emitted for audit logs (`[GDPR] Right to be Forgotten executed for user. Purged X logs.`).

## 4. UI/UX Accessibility & Compliance

Security and privacy extend to usability. The ecosystem is hardened to meet WCAG 2.1 accessibility standards:
- All form inputs (e.g., login screens) utilize strict `id` and `htmlFor` bindings.
- Dynamic error states announce themselves securely via `aria-live="polite"` tags.
- The global Management Layout strictly adheres to HTML5 structural landmarks (`<main>`, `<nav>`, `<aside>`, `<header>`) enabling robust keyboard and screen-reader navigation.
