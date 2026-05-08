# Kiosk Path Configuration Guide

This guide details how to configure the "Touch Import Path" and "Orders Path" for Kiosks, ensuring correct file transfer and order processing.

## 1. Configuring from Touch App (Connection Screen)

When connecting a Touch Kiosk for the first time or re-configuring it, you can set the paths in the connection modal.

![Touch App Path Configuration](e:/ClickFlash/.agent/images/touch_path_config.png)

**Fields:**

- **Monitored Photo Folder**: The local path on the Kiosk where it looks for photos to display.
- **Orders Hot Folder**: The local path on the Kiosk where it saves JSON order files.
- **Master Shared Orders Folder**: The network path (on the Master PC) where the Kiosk copies its orders to. **Crucial**: This must be accessible by the Kiosk.

## 2. Configuring from Master App (Add/Edit Kiosk)

You can also configure these paths from the Master App's "Kiosks" settings page.

![Master App Add Kiosk Check](e:/ClickFlash/.agent/images/master_add_kiosk_config.png)

**Fields:**

- **Kiosk Upload Folder Path**: The path where "Send to Touch" will copy photos. This should match the **Monitored Photo Folder** on the Kiosk.
- **Kiosk Orders Folder Path**: The path where Master monitors for incoming orders from this specific Kiosk.

> [!IMPORTANT]
> Ensure these paths match exactly between the Kiosk physical setup and the Master configuration. The "Send to Touch" feature relies on the **Kiosk Upload Folder Path** being correct and writable.

## Troubleshooting

If "Send to Touch" fails:

1. Check that the paths in the Master App match the Kiosk's actual folders.
2. Ensure the Master App has write permissions to the configured network path.
3. Verify that the **OrderWatcher** service is running (logs in Master console) if orders are not appearing.
