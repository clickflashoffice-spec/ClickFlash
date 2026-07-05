# ClickFlash Production Goals & OKRs

This document defines the overarching business and technical targets for the ClickFlash ecosystem. All architectural decisions and features must align with these Objectives and Key Results (OKRs).

## Objective 1: Unshakable Reliability (Zero-Downtime Studio Operations)
The core mission of ClickFlash is to ensure photography studios never lose a sale due to technical failure.

- **Key Result 1:** Maintain 100% functionality of the Master and Touch apps even in a complete offline network state.
- **Key Result 2:** Database corruption events must remain strictly at 0%.
- **Key Result 3:** OTA Updates for Electron apps must have a 99.9% successful silent installation rate.

## Objective 2: High-Velocity, Confidence-Driven Delivery
Human intervention in deployments introduces risk. The Auto-Loop must govern deployments.

- **Key Result 1:** 100% of pull requests to `main` must pass automated E2E tests before merge.
- **Key Result 2:** Deployment time from push-to-main to cloud deployment must average under 5 minutes.
- **Key Result 3:** Zero manual steps required to produce `.exe` artifacts.

## Objective 3: Best-in-Class Customer Experience
Performance directly correlates to sales conversions on the Gallery and Touch Kiosk.

- **Key Result 1:** Touch Kiosk memory consumption must not exceed 500MB during heavy, continuous usage over an 8-hour shift.
- **Key Result 2:** Public Gallery load times must fall under 1.5 seconds for the Largest Contentful Paint (LCP) globally.
- **Key Result 3:** Sentry unhandled exception rate across all applications must remain below 0.1%.
