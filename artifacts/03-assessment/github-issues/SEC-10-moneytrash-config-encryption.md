---
title: "[SEC-10] Config files unencrypted - MoneyTrash"
labels: ["security", "high", "encryption"]
assignees: []
---

## Finding: SEC-10

**App:** MoneyTrash  
**Severity:** High  
**Layer:** Operations  
**Status:** Open  
**Found Date:** 2026-04-08  
**Owner:** DevOps  

## Description

Config files stored in plaintext JSON at:
- `~/.config/moneytrash-uploader/config.json`
- `~/.local/share/moneytrash-uploader/upload_history.json`

## Impact

- Credentials exposed if filesystem compromised
- S3/R2 keys leaked
- API credentials exposed

## Remediation

1. Encrypt config at rest
2. Use OS keychain (KWallet, Keychain, Credential Manager)
3. Implement secret retrieval from secure storage

**Effort:** 1 day  
**Priority:** P2  
**SLA:** 1 week