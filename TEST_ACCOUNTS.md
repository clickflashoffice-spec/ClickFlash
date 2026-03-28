# ClickFlash Test Accounts & Logins

This document centralized all the test credentials and access codes used for local and production E2E testing across the ClickFlash ecosystem.

## 1. Customer Digital Gallery (Downloads)

Used to simulate a customer viewing and downloading their standard purchased digital photos.

- **URL:** [Gallery Frontend]
- **Email:** `test@clickflash.ai`
- **PIN:** `999999`
- **Expected Result:** Instant access to purchased gallery, ability to download ZIP.

## 2. MoneyTrash B2B Kiosk (Purchases)

Used to simulate a B2B guest viewing their archived "Money Trash" photos and purchasing them via Stripe.

- **URL:** [Gallery Frontend -> "Buy Photos" Tab]
- **Access Code:** `TEST-B2B-1234`
- **Expected Result:** Displays watermarked preview photos at a 50% discount with a "Buy Now" checkout button.

## 3. Management Hub (Admin)

Used to log into the centralized analytics and management dashboard.

- **URL:** [Management Frontend]
- **Email:** `admin@clickflash.ai`
- **Password:** `DEFAULT_PASSWORD_PLACEHOLDER` _(Note: Check live DB if this was changed during setup)_
- **Expected Result:** Access to global sales, synced orders, and ecosystem health metrics.

## 4. Master Station (Local Node)

Used by photographers to log into the physical offline kiosks at destinations.

- **App:** Electron Master App / Python Core
- **Face ID:** (Requires registering a test face initially)
- **Role:** Photographer
- **Expected Result:** Access to local album creation, importing photos, and customer ordering.
