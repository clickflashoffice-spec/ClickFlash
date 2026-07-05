# ClickFlash Venue Operator Guide

Welcome to the ClickFlash ecosystem! As a venue operator, you are in control of the Master Hub and Touch Kiosks. This guide covers daily operations, system checks, and troubleshooting.

## 1. Daily Boot Sequence

1. **Power On**: Turn on the main PC hosting the **Master App**.
2. **Launch Master**: Double-click the `ClickFlash Master` desktop icon. 
3. **Verify Sync**: Check the top-right corner of the Dashboard. The cloud icon should be **GREEN** (Online & Syncing). If it is red, check your venue's internet connection.
4. **Boot Kiosks**: Turn on the iPads or touchscreens for the **Touch Kiosks**. Launch the ClickFlash Touch app. They will automatically discover the Master Hub over the local network.

## 2. Managing the Touch Kiosks

### Kiosk States
- **Green Dot**: Kiosk is paired and online.
- **Yellow Dot**: Kiosk is updating or syncing heavy batches.
- **Red Dot**: Kiosk has lost local connection to the Master Hub.

### Admin Settings on Kiosk
To access the hidden settings menu on a kiosk:
1. Tap the bottom left corner of the screen 5 times rapidly.
2. Enter the daily PIN (Default: `1234`).
3. From here, you can manually force a sync, recalibrate the touch screen, or reboot the kiosk software.

## 3. Order Management & Refunds

All guest orders sync automatically. To view them:
1. Open the **Orders** tab on the Master App.
2. You can search by Guest Email, Date, or Album ID.
3. **Refunds**: Click on an order and select "Process Refund". This will sync to Stripe automatically. Note: If the guest paid with cash, the system marks the album as unlocked, but you must manually refund the physical cash from your register.

## 4. Troubleshooting Offline Mode

ClickFlash is designed with an "Offline-First" architecture. 
- If the internet goes down, **DO NOT PANIC**. 
- Photographers can continue shooting. Guests can continue viewing albums and paying with cash.
- The system queues all digital deliveries and credit card captures locally. 
- Once the internet is restored, the Master Hub will automatically flush the queue and process the backlog.

> [!WARNING]
> Never forcefully shut down the Master App while the "Flushing Queue" indicator is visible, as this could interrupt payments.
