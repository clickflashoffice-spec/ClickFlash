# Click&Flash Global Multi-Master Architecture

This document describes how to connect multiple Master App instances (installed at physical locations worldwide) to a centralized suite of Cloudflare-deployed applications (Management Hub, Customer Gallery, and Website).

## 🛰️ Architecture Overview

The system uses a **Hub-and-Spoke** model:

- **Spokes (Master Apps)**: Local servers at each resort/desk that process photos and create local orders.
- **Hub (Cloud Apps)**: Centralized management and customer-facing interfaces hosted on Cloudflare Workers.

Master Apps act as the **exclusive gateway**, pushing processed assets and orders to the Cloud Hub via an encrypted HTTPS connection.

---

## ⚙️ Master Node Configuration

Each Master App instance must be uniquely identified to prevent data collisions and enable site-specific management.

### 1. Identity Setup

Every Master App requires a unique `DESK_ID`.

- **Location**: `.env` file or `Cloud & Retention` settings tab.
- **Pattern**: `[LOCATION]_[SITE]_[MASTER_NUMBER]` (e.g., `PARIS_DISNEY_M01`).

### 2. Cloud Gateway Credentials

Master nodes authenticate with the Cloud Hub using dedicated credentials.

- **CLOUD_API_URL**: The public URL of your Unified Site (e.g., `https://clickflash-unified.pages.dev`).
- **CLOUD_EMAIL**: The account email for auth.
- **CLOUD_PASSWORD**: The account password for auth.

### 3. Verification

Once configured, the **Cloud & Retention** tab in Master App settings will show a **CONNECTED** status if the handshake is successful.

---

## 🌐 Cloudflare Deployment (The Hub)

The Cloud Hub consists of a unified deployment managed by the `deploy_ecosystem.ps1` script:

| App | Hub Path | Purpose | Storage |
| --- | --- | --- | --- |
| **Management Hub** | `/manage` | Business reporting, node monitoring. | D1 (DB), R2 (Assets) |
| **Customer Gallery** | `/gallery` | Online photo portal. | D1 (Metadata), R2 (Photos) |
| **Global Website** | `/` | Marketing and booking engine. | D1 (Bookings) |

### Deployment Script

Run the following from the root to deploy/update your entire cloud hub:

```powershell
./deploy_ecosystem.ps1
```

### Synchronization Logic

Master Apps push data to the `assets` and `orders` collections. Every record is tagged with the source `desk_id`. This allows:

- The Management Hub to filter reports by location.
- The Gallery to display site-specific albums for customers.

---

## 📋 Pre-Configured Node Identities

I have generated a ready-to-use list of **100 unique identities** for global expansion.
See [MASTER_NODE_IDENTITIES.md](file:///e:/ClickFlash/MASTER_NODE_IDENTITIES.md) for the full list of IDs and Emails.

---

## 🚀 "Easy Config" Unified Setup

To simplify the deployment of a new Master Node, use the following **Easy Config** pattern:

### Standardized `.env` for Master Nodes

Instead of configuring multiple settings, ensure your deployment script provides these core variables:

```bash
# Identity
DESK_ID="YOUR_UNIQUE_ID"

# Cloud Bridge
CLOUD_API_URL="https://clickflash-unified.pages.dev"
CLOUD_EMAIL="node-auth@your-hub.com"
CLOUD_PASSWORD="secure-password-here"

# Feature Flags
ENABLE_CLOUD_SYNC=true
MONEYTRASH_ENABLED=true
```

### The "One-Touch" Connect

1. Deploy the Master App at the local site.
2. Log in as Admin.
3. Go to **Settings > Cloud Settings**.
4. Enter the `Desk ID` and `Cloud Email`.
5. Click **Verify & Connect** (or use the **Import** button to upload a pre-configured JSON).

---

## 🗺️ Multi-Master Routing

When a customer visits the **Customer Gallery**, the system identifies which Master node owns the data via the **Album ID** or a **Site Code** appended to the URL:

`https://clickflash-unified.pages.dev/gallery/RESORT_A/ALBUM_123`

The cloud backend automatically routes lookups to the D1 records tagged with the corresponding `desk_id`.
