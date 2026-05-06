# Destination Onboarding Protocol

This document outlines the standard operating procedure (SOP) for adding a new destination (hotel/resort) or Master Node to the ClickFlash ecosystem.

## 1. Cloud Infrastructure & Registration (Management Hub)

The ClickFlash ecosystem uses a centralized Hub architecture (Cloudflare Workers + D1 + R2). Storage and database records are namespaced by a unique `desk_id`.

1. **Log into the Management Hub** (Admin Account).
2. **Navigate to Fleet Management / Desks**.
3. **Register New Station**:
   - Provide the `deskName` (e.g., "Main Lobby Desk").
   - Provide the `deskLocation` (e.g., "Concorde Green Park").
   - Enter standard credentials (email/password) for this new Master.
4. **Save the generated Token / Credentials**:
   - The Hub will generate a unique `desk_id`.
   - Take note of the credentials as they will be required during the Master App Setup Wizard.

## 2. Hardware Preparation & Lockdown (Master Node)

The Master App machine is the reliable core for each resort. It must be locked down to prevent tampering and ensure 100% uptime for the kiosk.

1. **OS Configuration (Windows)**:
   - Create a dedicated standard user account for the kiosk (e.g., `ClickFlashKiosk`).
   - Configure **Assigned Access (Kiosk Mode)** setting the ClickFlash Master App as the primary application.
   - Or configure Shell Replacement so the system boots directly into the Master App.
   - Disable system shortcuts (Ctrl+Alt+Del, Alt+Tab, Win Key).
2. **Network Setup**:
   - Connect the Master Node to the dedicated isolated LAN.
   - Assign a static IP address to the Master Node (e.g., `192.168.1.100`) so Touch iPads can reliably connect.

## 3. Application Deployment & Hub Pairing

1. **Install Master App**:
   - Run the provided `ClickFlash-Master-Setup.exe` (NSIS Installer) on the Master Node.
2. **Setup Wizard Execution**:
   - Launch the application. The Setup Wizard will appear on first boot.
   - **Step 1: Welcome & Credentials**: Enter the email/password registered in the Hub.
   - **Step 2: Sync Validation**: The app will ping the Management Hub to verify the credentials and obtain its `desk_id`.
   - **Step 3: Storage Configuration**: Confirm the local output and upload directories default paths.
   - **Step 4: Completion**: The Master App will finalize setup and reboot into the main dashboard.
3. **Touch App Deployment**:
   - Install the Touch App on the customer iPads.
   - During the Touch App's initial configuration, input the static IP address of the Master Node (e.g., `http://192.168.1.100:8000`).

## 4. Verification & E2E Validation

Before leaving the site, perform these critical validations:

1. **Local Import Test**:
   - Insert an SD card or drag a dummy folder into the Master App import dropzone.
   - Verify the Master App processes the photos and successfully generates the thumbnails.
   - Verify the Touch App automatically displays the new photos via the local LAN bridge.
2. **Cloud Sync & Order Test**:
   - On the Touch App, select a photo and complete a dummy checkout (MoneyTrash or Digital Gallery).
   - Ensure the order appears in the Master App's "Orders" tab.
   - Check the Management Hub online dashboard to confirm the order synced to the cloud via the new `desk_id`.
3. **Email Relay Test** (Optional):
   - Check the provided customer email inbox to ensure the receipt or magic link was delivered via the Hub's Resend proxy.
