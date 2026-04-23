# Finding: No Explicit PII Handling Documentation

**Finding ID:** F-DATA-001  
**Date:** 2026-04-08  
**App:** Master Portal  
**Domain:** Data Governance  
**Severity:** Medium  

## Description

No explicit PII handling patterns found in codebase. No data masking, tokenization, or PII classification visible in code.

**Evidence:**
- Search for `pii|PII|personally identifiable|sensitive data` returned no results
- Customer data (email, phone, address) stored in plain text in SQLite
- No field-level encryption for PII

## Impact

Without explicit PII handling:
- GDPR compliance cannot be verified
- Right-to-erasure may not be properly implemented
- Data breach exposure is unclear

## Recommendation

Document PII fields in the data model:
- Customer names, emails, phone numbers
- Payment information
- Photo metadata with geolocation

Implement field-level encryption or masking for sensitive PII.

## References

- D-02: PII inventory complete
- D-03: Data classification applied

## Owner

Data/Privacy

## Status

Open
