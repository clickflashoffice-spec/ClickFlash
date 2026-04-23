---
title: "[SEC-09] Webhook signature not verified - MoneyTrash"
labels: ["security", "high", "webhook"]
assignees: []
---

## Finding: SEC-09

**App:** MoneyTrash  
**Severity:** High  
**Layer:** Integrations  
**Status:** Open  
**Found Date:** 2026-04-08  
**Owner:** Backend  

## Description

`verifyWebhookSignature()` always returns `true`.

**Location:** `apps/moneytrash/cloudflare/src/handlers/webhook.ts`

## Impact

- Fake webhook events accepted
- Payment processing manipulated
- Financial data corruption

## Remediation

1. Implement actual signature verification
2. Verify using Stripe webhook secret
3. Add signature mismatch logging

**Effort:** 1 day  
**Priority:** P2  
**SLA:** 1 week

---
*PCI compliance issue*