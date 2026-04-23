# Compliance Audit Checklist

## GDPR (EU)

### Lawful Basis (Art. 6)
- [ ] Consent obtained for data processing
- [ ] Contract performance basis documented
- [ ] Legitimate interest assessed where applicable

### Transparency (Art. 13-14)
- [ ] Privacy policy available
- [ ] Data processing purposes disclosed
- [ ] Retention periods specified

### Data Subject Rights
- [ ] Access right implemented (Art. 15)
- [ ] Rectification available (Art. 16)
- [ ] Erasure implemented (Art. 17)
- [ ] Portability available (Art. 20)
- [ ] Objection process exists (Art. 21)

### Data Protection by Design
- [ ] Data minimization applied
- [ ] Pseudonymization where possible
- [ ] Encryption at rest implemented

### Breach Notification (Art. 33-34)
- [ ] Detection mechanism in place
- [ ] 72-hour notification process documented
- [ ] DPA contact established

## CCPA (California)

### Consumer Rights
- [ ] Right to know implemented
- [ ] Right to delete implemented
- [ ] Right to opt-out implemented
- [ ] Non-discrimination policy exists

### Privacy Practices
- [ ] Do Not Sell disclosed
- [ ] Service provider designations documented
- [ ] Incentive programs disclosed

### Verification
- [ ] Identity verification for data requests
- [ ] Two-factor verification for sensitive requests

---

## Per-App Compliance Status

| App | GDPR | CCPA | Notes |
|-----|------|------|-------|
| Master | ⚠️ Partial | ⚠️ Partial | Services exist, need API routes |
| Touch | N/A | N/A | No consumer data |
| MoneyTrash | ⚠️ Partial | ⚠️ Partial | Services exist |
| Gallery | ❌ Missing | ❌ Missing | No erasure API |
| Management | ❌ Missing | ❌ Missing | No erasure API |
| Website | ⚠️ Partial | ⚠️ Partial | Forms only |
| Master C++ | ❌ Missing | ❌ Missing | No API |

---

*Checklist version: 1.0*