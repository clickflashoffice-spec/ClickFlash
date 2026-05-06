# Specification - Phase 65: User & Installation Manuals

## Overview

Phase 65 aims to provide comprehensive, visual, and technical documentation for the entire ClickFlash ecosystem. This ensures that photographers, onsite staff, and system administrators can operate and maintain the system effectively.

## Architecture & Scope

The documentation will cover three primary applications and the underlying infrastructure:

1. **Master App**: The central photographer station (Electron/React/Node.js).
2. **Touch App**: The customer-facing kiosk (Electron/React/Node.js).
3. **Management Hub**: The cloud-based fleet management portal ([clicketflash.com](https://www.clicketflash.com/manage/?mode=management)).

## Documentation Deliverables

### 1. User Manuals (Visual)

- **Master App User Manual**:
  - Start-to-finish workflow for a photoshoot.
  - Manual vs. AI-enhanced editing guide.
  - Kiosk synchronization and fulfillment tracking.
- **Touch App User Manual**:
  - Customer selection process.
  - Using Face Search (localized AI).
  - Checkout and order finalization.
- **Management Hub User Manual**:
  - Monitoring site health and revenue.
  - Using AI Forecasting for business growth.
  - Remote Master support and emergency tunneling.

### 2. Installation & Troubleshooting (Technical)

- **Deployment Guide**:
  - Setting up Cloudflare infrastructure (D1 databases, R2 buckets).
  - Configuring the Ethernet Bridge between Master and Touch apps.
  - Hardware requirements and OS-level kiosk lockdown (Assigned Access).
- **Troubleshooting FAQ**:
  - Resolving sync conflicts.
  - Handling database corruption or "Photo Not Found" errors.
  - Network diagnostic steps.

## Formatting & Assets

- **Visuals**: High-resolution screenshots captured from the running applications.
- **Standard**: Markdown format stored in `.agent/docs/manuals/` for easy versioning and cross-laptop access.
- **Aesthetics**: Clean, structured, and easy to read, following the project's premium design philosophy.

## Verification

- Technical review of all steps to ensure they align with the current codebase state.
- Cross-reference with Operational Laws to ensure compliance.
