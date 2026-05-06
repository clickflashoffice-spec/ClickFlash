# ClickFlash — Test Login Credentials

> Last Updated: 2026-03-08

---

## 1. Customer Gallery — Order Download (My Downloads tab)

**URL:** https://www.clicketflash.com/gallery

| Field | Value                     |
| ----- | ------------------------- |
| Tab   | **My Downloads**          |
| Email | `tester@clicketflash.com` |
| PIN   | `212625`                  |

**What to test:**

- Login → See ordered photos → Download high-res

---

## 2. Customer Gallery — MoneyTrash Buy Photos (Buy Photos tab)

**URL:** https://www.clicketflash.com/gallery

| Field       | Value          |
| ----------- | -------------- |
| Tab         | **Buy Photos** |
| Access Code | `TESTMT2026`   |

**What to test:**

- Enter access code → Browse 6 archived photos → Buy at 50% discount

> Note: Photos are seeded with Unsplash demo images. The UI will show them as available for purchase.

---

## 3. Management Hub — Admin Login

**URL:** https://manage.clicketflash.com (or the Cloudflare worker URL)

| Field    | Value                         |
| -------- | ----------------------------- |
| Email    | `clickflash.office@gmail.com` |
| Password | _(see `.env` or Hub DB)_      |

---

## 4. Master App — Local Admin Login

**URL:** http://localhost:3000 (or Electron app)

| Field    | Value             |
| -------- | ----------------- |
| Email    | _(from local DB)_ |
| Password | _(from local DB)_ |

---

## Flow Summary

```
[Master App]
  → Creates Order (paid status)
  → cloudSyncService.ts pushes to Hub: POST /api/cloud/sync/order
  → Hub stores order with access_pin = 212625

[Customer Gallery - My Downloads]
  → Login with email + PIN
  → Gallery fetches order from Hub → Shows photos → Download

[Master App]
  → Retention queue pushes unsold photos: POST /api/cloud/upload-photo (Gallery backend)
  → Photos stored in D1 with access_code = TESTMT2026

[Customer Gallery - Buy Photos]
  → Enter access code TESTMT2026
  → Gallery fetches photos from D1 → Shows at 50% discount → Purchase
```
