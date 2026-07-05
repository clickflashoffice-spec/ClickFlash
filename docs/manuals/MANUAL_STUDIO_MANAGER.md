# ClickFlash Studio Manager Manual

## The Complete Guide to Running Your Photography Desk

---

**Version 1.0** | **For ClickFlash Studio Manager** | **Last Updated: June 2026**

---

# Table of Contents

1. [Welcome to ClickFlash](#1-welcome-to-clickflash)
2. [Your First 5 Minutes](#2-your-first-5-minutes)
3. [Your Daily Routine](#3-your-daily-routine)
4. [Common Tasks](#4-common-tasks)
5. [When Something Goes Wrong](#5-when-something-goes-wrong)
6. [Monthly Tasks](#6-monthly-tasks)
7. [Glossary](#7-glossary)
8. [Index](#8-index)

---

# 1. Welcome to ClickFlash

## 1.1 What Is ClickFlash?

ClickFlash is the operating system for professional photography businesses. It handles everything from the moment a photographer takes a picture to the moment a guest walks away with their prints, digital downloads, or merchandise.

Think of ClickFlash as having three parts:

| Part | What It Is | Where It Lives |
|------|-----------|----------------|
| **Master** | The studio brain. This is the main computer you will use every day. | Your desk, in the back office. Runs on port `8090`. |
| **Touch** | The customer-facing kiosks where guests browse and buy their photos. | Out front, near the lobby or reception. Runs on port `8091`. |
| **Cloud Hub** | The management website you use for reports, settings, and remote monitoring. | On the internet, accessible from any browser. |

You, the Studio Manager, spend most of your time on the **Master** computer. The **Touch** kiosks mostly run themselves, but you need to know when they are healthy and when they need attention.

## 1.2 What This Manual Covers

This manual teaches you how to:

- Start your day with confidence
- Handle photo uploads from photographers
- Process guest orders, refunds, and special requests
- Keep your system healthy and backed up
- Know exactly who to call when something breaks
- Handle the monthly paperwork: payouts, payroll, and inventory

You do not need to be technical. You do not need to know how to write code, fix networks, or install software. If you can use a web browser and follow a numbered list, you can run a ClickFlash studio.

## 1.3 Glossary of Key Terms

Before we go further, here are the words you will see throughout this manual and in the software itself.

| Term | Plain-English Meaning |
|------|----------------------|
| **Album** | A folder of photos from one session, one event, or one day. When a photographer plugs in a memory card, ClickFlash creates an album automatically. |
| **Ingest** | The process of copying photos from a camera memory card into ClickFlash. It happens automatically when a photographer plugs in a card. |
| **Order** | A purchase made by a guest. An order can include prints, digital downloads, or merchandise. |
| **Master** | The main computer at your desk. This is where you manage everything. |
| **Touch** | A customer-facing kiosk with a touchscreen. Guests browse photos and buy here. |
| **Sync** | Short for synchronization. This means copying data between the Master, the Touch kiosks, and the Cloud Hub so everything stays up to date. |
| **Cloud Hub** | The website where you view reports, change settings, and manage your studio from anywhere. |
| **MoneyTrash** | The marketplace where unsold photos are listed for resale. You earn payouts from photos other studios or buyers purchase. |
| **Receipt** | The printed or emailed confirmation of a guest's order. |
| **Refund** | Returning money to a guest who cancelled or changed their mind. |
| **Local Mode** | When the internet is down, ClickFlash keeps working on your local network. Orders and photos are saved locally and sync later when the internet returns. |
| **SD Card** | The small memory card that photographers use in their cameras. Also called a memory card. |
| **Dashboard** | The main screen on the Master that shows your daily numbers, alerts, and status indicators. |
| **Green Indicator** | A status light or icon that means everything is working fine. |
| **Red Indicator** | A status light or icon that means something needs your attention. |
| **L1 / L2 / HQ** | The support escalation tree. L1 is the first help desk. L2 is an engineer. HQ is the on-call headquarters team for serious issues. |

---

# 2. Your First 5 Minutes

## 2.1 Turning On the Master

The Master computer is the most important piece of equipment in your studio. Without it, nothing else works.

### Step-by-step: Turn on the Master

1. Find the **Master computer** at your desk. It is usually a desktop PC with a monitor, keyboard, and mouse.
2. Press the **power button** on the front of the computer.
3. Wait for the computer to start. This usually takes 30 to 60 seconds.
4. The **ClickFlash Master** application will open automatically. If it does not, double-click the **ClickFlash Master** icon on the desktop.
5. You should see a **login screen** with two fields: **Username** and **Password**.

💡 **Tip:** If the login screen does not appear, check that the monitor is turned on and the cable is connected. If the screen is still blank, call support.

## 2.2 Logging In for the First Time

Every ClickFlash system ships with a default administrator account. You must use this account the very first time, then change the password immediately.

### Step-by-step: First-time login

1. In the **Username** field, type `admin`.
2. In the **Password** field, type `admin`.
3. Click the **Log In** button.
4. You will be taken to the **Dashboard**.

⚠️ **Warning:** The default password is `admin`. This is the same for every new system in the world. If you do not change it immediately, anyone who knows ClickFlash can walk into your studio and access your data. Change it now.

## 2.3 Changing Your Password

You must change the default password before you do anything else. This is a security requirement, not a suggestion.

### Step-by-step: Change the default password

1. Look at the top-right corner of the screen. Click your name or the **person icon**.
2. From the menu that drops down, click **Settings**.
3. Click the **Security** tab on the left side.
4. Find the field labeled **Current Password** and type `admin`.
5. Find the field labeled **New Password** and type a strong password. A strong password is at least 12 characters long and includes uppercase letters, lowercase letters, numbers, and symbols. Example: `Beach2026!Summer`.
6. Find the field labeled **Confirm New Password** and type the same password again.
7. Click the **Save Changes** button.
8. You will see a green message that says **"Password updated successfully."**
9. Log out and log back in with your new password to make sure it works.

💡 **Tip:** Write your new password down and store it in a secure place, such as a locked drawer or a password manager. Do not leave it on a sticky note on the monitor.

⚠️ **Warning:** If you forget the admin password, you will need another administrator to reset it for you. If there are no other administrators, you must call L2 support. There is no "I forgot my password" button on the login screen for security reasons.

## 2.4 A Quick Tour of the Dashboard

After you log in, you land on the **Dashboard**. This is your home screen. Everything you need to know about the day is right here.

### The Dashboard has four main areas:

| Area | What You See | What It Means |
|------|-------------|-------------|
| **Top Bar** | Your studio name, the date, and your profile icon. | This never changes. It is always visible. |
| **Summary Cards** | Large numbers for today's orders, today's revenue, active photographers, and disk space remaining. | These tell you how the day is going at a glance. |
| **Status Panel** | Green or red dots for **Touch kiosks**, **Cloud sync**, **Backup status**, and **Internet connection**. | Green means good. Red means you need to act. |
| **Recent Activity** | A list of the most recent orders, photo uploads, and system events. | This tells you what has happened in the last few hours. |

Spend two minutes looking at each area. Click the cards. They will take you to the detailed pages. You cannot break anything by clicking around.

💡 **Tip:** If a number looks wrong, click it. The detail page will show you the raw data. Often the number is correct and you just forgot about a transaction.

## 2.5 Turning On the Touch Kiosks

If you have Touch kiosks in your studio, you should turn them on every morning.

### Step-by-step: Turn on a Touch kiosk

1. Find the **Touch kiosk** out front. It looks like a large tablet or a touchscreen monitor on a stand.
2. Press the **power button** on the side or the back of the kiosk. If the screen is black, it is off. If it is showing a screensaver, tap the screen to wake it.
3. The kiosk will show the **guest welcome screen** with your studio branding. This means it is ready.
4. Repeat for every kiosk in your studio.

💡 **Tip:** Most studios have between one and four Touch kiosks. If you are not sure how many you have, look at the **Status Panel** on the Master Dashboard. It shows one dot per kiosk.

---

# 3. Your Daily Routine

## 3.1 Morning Dashboard Check (5 Minutes)

Every morning, before you open to guests, spend five minutes looking at the Dashboard. This is the most important habit you can build. It catches problems before guests notice them.

### Step-by-step: Morning check

1. On the **Master**, make sure you are on the **Dashboard** screen. If you are somewhere else, click **Dashboard** in the left-hand menu.
2. Look at the **Status Panel** in the upper-right area. You should see four green dots:
   - **Touch Online** — green means all kiosks are responding.
   - **Cloud Sync** — green means your data is up to date with the Cloud Hub.
   - **Backup Ready** — green means last night's backup completed.
   - **Internet** — green means you have an internet connection.
3. If any dot is **red**, see the troubleshooting section for that specific item. Do not open to guests until you know why it is red.
4. Look at the **Disk Space** card. If it says **"Under 20%"** or **"Under 10%"**, you need to free up space today. See the disk space task in Chapter 4.
5. Look at the **Today's Orders** and **Today's Revenue** cards. These should be zero or very low if you have not opened yet. If they are unexpectedly high, someone may have placed an order overnight, or yesterday's data may still be syncing. Check the timestamps in the **Recent Activity** list.
6. Look at the **Active Photographers** card. If you expect three photographers today and the card shows two, one may have forgotten to check in. You can add or check photographer status later.
7. Click **Sync Now** in the Status Panel if the Cloud Sync dot is yellow. This forces a manual sync. It should turn green within a minute.

⚠️ **Warning:** If the **Touch Online** dot is red, guests cannot browse or buy photos. This is a stop-everything-and-fix-it problem. See Section 5.2.

💡 **Tip:** If all four dots are green, you can open with confidence. Say out loud, "Dashboard is green. We are good to go." This simple habit reduces morning stress and prevents surprises.

## 3.2 Photo Upload and Ingest (As Needed)

Photographers take photos on cameras. Those photos live on small **SD cards**. To get the photos into ClickFlash so guests can see and buy them, the photographer plugs the SD card into the Master computer. ClickFlash does the rest.

### What happens automatically

When a photographer inserts an SD card into the card reader connected to the Master, ClickFlash:

1. Detects the card.
2. Scans for image files.
3. Copies the images into a new **album**.
4. Generates preview thumbnails so the images load quickly on the Touch kiosks.
5. Adds the album to the guest browsing list.
6. Shows a notification on the Dashboard.

This process is called **ingest**. It usually takes between 30 seconds and 5 minutes, depending on how many photos are on the card.

### Step-by-step: Ingest photos from an SD card

1. Take the **SD card** from the photographer.
2. Insert the SD card into the **card reader** connected to the Master computer. The card reader is usually a small USB device on the desk.
3. Look at the **Dashboard**. Within 5 seconds, you should see a notification that says **"SD card detected. Starting ingest..."**.
4. Wait for the ingest to finish. Do not remove the card while the notification says **"In progress."**
5. When the ingest finishes, the notification changes to **"Ingest complete. 47 photos added to album 'Beach Session - June 12'."** The number and album name will be different for you.
6. Click the notification, or click **Albums** in the left menu, to review the new album.
7. Verify that the album contains the expected number of photos. If a photographer shot 50 photos and the album shows 48, two photos may have been corrupted or deleted on the camera. This is normal. Ask the photographer if they deleted any shots.
8. Eject the SD card safely by clicking the **eject icon** next to the card name in the **Albums** list, or by right-clicking the card in the system tray and selecting **Eject**.
9. Return the SD card to the photographer.

⚠️ **Warning:** Never pull the SD card out while the ingest is in progress. This can corrupt the photos and damage the card. Wait for the green **"Complete"** message.

💡 **Tip:** If the card is not detected, try flipping it over and inserting it again. SD cards are notched so they only fit one way, but the card reader slot can be tight. Gentle pressure is enough. If it still does not work, try a different card reader port.

### What if the photos do not appear?

If you insert a card and nothing happens after 30 seconds:

1. Check that the card reader's LED light is on. If the light is off, the reader is not connected. Check the USB cable.
2. Try a different SD card. If the second card works, the first card may be damaged.
3. Open the system file explorer and see if the card appears as a removable drive. If it does not appear there either, the card or the reader is faulty.
4. If the card appears in the file explorer but ClickFlash does not detect it, see Section 5.3.

## 3.3 Order Monitoring (Throughout the Day)

When guests buy photos at the Touch kiosks, those orders appear on the Master Dashboard in real time. You do not need to watch the screen every second, but you should check the order list periodically.

### Step-by-step: Check new orders

1. On the Master, click **Orders** in the left-hand menu.
2. You see a list of orders sorted by time, newest first.
3. Each row shows: the order number, guest name, total amount, items purchased, and status.
4. The status can be:
   - **Paid** — Payment went through. The order is complete. Nothing for you to do.
   - **Pending** — Payment is processing. Wait 1 to 2 minutes. It usually flips to Paid automatically.
   - **Failed** — Payment did not go through. The guest may need to try again, or you may need to help them at the kiosk. See Section 5.4.
   - **Refunded** — You or another manager processed a refund. This is normal.
5. Click any order row to see the full details: which photos were bought, which sizes, whether the guest chose print or digital, and any special instructions.

💡 **Tip:** If an order has special instructions, such as **"Please crop out the stranger on the left"** or **"Ship to Room 402"**, the order row will have a small **flag icon**. Click it immediately so the instruction is not missed.

## 3.4 End-of-Day Backup (5 Minutes)

At the end of every business day, ClickFlash runs an automated backup to the cloud. This backup includes all photos, orders, and settings from the day. If the Master computer ever breaks, you can restore everything from this backup.

### Step-by-step: Verify the backup

1. At closing time, or within 30 minutes after your last order, return to the **Dashboard**.
2. Look at the **Status Panel**.
3. Find the **Backup Ready** dot. If it is **green**, the backup is complete. You are done.
4. If it is **yellow**, the backup is in progress. Wait 10 minutes and check again. Backups usually finish within 15 minutes of closing.
5. If it is **red**, the backup failed. Click the red dot to see the error message. Common causes: internet was down, or the backup disk was full. If the error says **"No internet connection,"** and your internet is now back, click **Run Backup Now** to retry. If it fails again, see Section 5.5.

💡 **Tip:** You do not need to stay late for the backup. It runs automatically. Just verify it is green before you leave. If it is yellow, you can lock up and go home. It will finish on its own. If it is red, do not leave until you have started a retry or called support.

⚠️ **Warning:** If the Backup Ready dot is red for more than one day, your studio is at risk. If the Master computer fails, you will lose everything since the last successful backup. Make backup health your top priority.

## 3.5 Closing the Touch Kiosks

You do not need to turn off the Touch kiosks every night. They can stay on and run a screensaver. However, if your studio policy requires shutting them down, or if you are closing for a multi-day holiday, here is how.

### Step-by-step: Turn off a Touch kiosk

1. Walk to the kiosk.
2. Tap the screen to wake it if it is in screensaver mode.
3. Tap the **gear icon** in the lower-right corner. This opens the kiosk admin menu.
4. Enter the **kiosk admin PIN**. This is not your Master password. It is a separate 4-digit PIN that your installer set up. If you do not know it, check the **Studio Info** page on your Master Dashboard, or call support.
5. Tap **Shut Down**.
6. Confirm by tapping **Yes**.
7. Wait for the screen to go black. The kiosk is now off.
8. Repeat for every kiosk.

💡 **Tip:** If you only close for one night, leave the kiosks on. They will receive overnight updates and be ready instantly in the morning. Turning them off and on every day adds wear to the hardware and takes longer to start.

---

# 4. Common Tasks

This chapter contains step-by-step instructions for the six tasks you will perform most often. Each task is designed to be printed and kept at your desk if needed.

## 4.1 Processing a Guest Photo Request

Sometimes a guest does not want to use the kiosk. They walk up to your desk and ask you to help them find their photos, place an order, or check if their order is ready. This is called a **guest photo request**.

### Step-by-step: Help a guest find their photos

1. Ask the guest for their **name**, **room number** (if you are in a hotel), or the **date of their photo session**.
2. On the Master, click **Albums** in the left-hand menu.
3. At the top of the Albums page, find the **Search** bar.
4. Type the guest's name, room number, or date. For dates, use the format `MM/DD/YYYY`, such as `06/12/2026`.
5. Press **Enter** or click the **magnifying glass icon**.
6. The album list filters to show only matching albums. Look for the album that matches the guest's session.
7. Click the album name to open it.
8. You now see all the photos from that session. Scroll through them with the guest to confirm these are the right photos.
9. If the guest wants to place an order, click the **Create Order** button in the upper-right corner.
10. Select the photos the guest wants by clicking the **checkbox** in the corner of each photo thumbnail.
11. Click **Next**.
12. Choose the products: prints, digital downloads, or merchandise. The prices shown are the current seasonal prices. See Section 4.4 if you need to change prices.
13. Click **Next**.
14. Enter the guest's payment information. You can swipe a card, tap a contactless card, or type the card number manually.
15. Click **Place Order**.
16. The screen shows a confirmation. Ask the guest if they want a **printed receipt** or an **email receipt**.
17. If printed, click **Print Receipt**. The receipt printer at your desk should activate. Hand the receipt to the guest.
18. If emailed, type the guest's email address and click **Send**.
19. Thank the guest and let them know their pickup time or digital download instructions.

💡 **Tip:** If the guest is not sure when their session was, try searching by photographer name. Ask the guest, "Do you remember who took your photos?" Then filter by photographer in the Albums page.

⚠️ **Warning:** Never write a guest's credit card number on paper. The system is designed so you only type the number into the secure payment form. If you write it down, you create a security risk and violate payment card rules.

## 4.2 Printing a Receipt

Guests often want a receipt for their records, especially for business expense reports or hotel billing.

### Step-by-step: Print a receipt for an existing order

1. Click **Orders** in the left-hand menu.
2. Find the order in the list. You can use the **Search** bar at the top to search by order number, guest name, or date.
3. Click the order row to open the detail page.
4. In the upper-right corner of the order detail page, click the **Print Receipt** button.
5. The receipt printer should activate within 3 seconds. If it does not, see the printer troubleshooting note below.
6. Hand the receipt to the guest.

### If the printer does not respond

1. Check that the printer is turned on. Look for a green LED light on the front panel.
2. Check that the printer has paper. Open the paper tray and look. If it is empty, load a new roll of thermal paper.
3. Check that the printer is connected to the Master with a USB cable. Make sure the cable is firmly seated on both ends.
4. Click **Print Receipt** again.
5. If it still does not print, click the **gear icon** next to the Print Receipt button and select **Print to PDF**. This creates a digital receipt you can email to the guest.
6. Call L1 support to schedule a printer repair.

💡 **Tip:** Keep a spare roll of thermal paper in your desk drawer. Receipt paper always runs out at the worst possible time. The paper size is usually 57mm or 80mm wide, depending on your printer model. Check the label on the paper box.

## 4.3 Handling a Refund

Sometimes a guest changes their mind, or there was a problem with the order. ClickFlash allows you to process refunds quickly and safely.

### Before you refund

Refunds are permanent. Once you click **Refund**, the money goes back to the guest's card. You cannot undo it. Make sure:

- The guest is present, or you have written authorization from the guest.
- You know the reason for the refund. You will need to select a reason from a dropdown list.
- The order is within your studio's refund policy window. Most studios allow refunds within 24 hours for digital products and 72 hours for prints.

### Step-by-step: Process a refund

1. Click **Orders** in the left-hand menu.
2. Find the order you want to refund. Use the search bar if needed.
3. Click the order row to open the detail page.
4. In the upper-right corner, click the **Refund** button.
5. A dialog box appears. It asks:
   - **Refund amount:** Full refund or partial refund. If partial, type the amount.
   - **Reason:** Select from the dropdown. Common reasons are **Guest changed mind**, **Duplicate order**, **Quality issue**, and **Staff error**.
   - **Notes:** Optional. Add any details that will help you remember why this refund happened.
6. Review the information. Make sure the amount is correct.
7. Click **Confirm Refund**.
8. The system processes the refund. This usually takes 5 to 15 seconds.
9. You see a green message: **"Refund processed successfully. Transaction ID: REF-12345-ABC."**
10. The order status changes to **Refunded**.
11. If the guest wants a receipt for the refund, click **Print Refund Receipt** and hand it to them.

⚠️ **Warning:** Refunds cannot be cancelled. If you accidentally refund the wrong order, the only way to recover the money is to ask the guest to place a new order. Double-check the order number before you confirm.

💡 **Tip:** If a guest asks for a refund because they say the photo quality is bad, first look at the photo on the screen with them. Sometimes what they think is a quality issue is actually a matter of taste, such as lighting or composition. If the photo is genuinely blurry, poorly cropped, or has a technical flaw, refund without hesitation and flag the photographer's album for review.

## 4.4 Changing Seasonal Pricing

Your studio probably charges different prices in summer and winter, or on weekends versus weekdays. ClickFlash lets you update prices from the Master without calling an engineer.

### Step-by-step: Update prices

1. Click **Settings** in the left-hand menu.
2. Click the **Pricing** tab.
3. You see a list of products: digital downloads, print sizes, merchandise items, and package bundles.
4. For each product you want to change, click the **pencil icon** next to the current price.
5. Type the new price. Use numbers and a decimal point. For example, `29.99`.
6. Press **Enter** or click the **checkmark icon** to save the change.
7. Repeat for all products you want to update.
8. When you are done, click the **Publish Changes** button at the bottom of the page.
9. A confirmation dialog appears. It lists all the changes you made. Review them carefully.
10. Click **Yes, Publish**.
11. The new prices are now live on the Touch kiosks and the Master. The change takes effect within 30 seconds on the kiosks.

⚠️ **Warning:** Price changes are immediate. If a guest is currently browsing the kiosk and you publish a price increase, they will see the new price on their next screen. Do not change prices in the middle of a busy transaction rush unless you have a plan to communicate the change to guests.

💡 **Tip:** You can schedule price changes for the future. Instead of clicking **Publish Changes**, click the **clock icon** next to it and select a date and time. This is useful for seasonal transitions, such as switching to holiday pricing at midnight on December 1st.

## 4.5 Adding a New Photographer

When you hire a new photographer, you need to add them to ClickFlash so the system can track their albums, orders, and payroll.

### Step-by-step: Add a photographer

1. Click **Staff** in the left-hand menu.
2. Click the **Photographers** tab.
3. Click the **Add Photographer** button in the upper-right corner.
4. Fill in the form:
   - **Full Name:** The photographer's legal name, as it appears on their payroll documents.
   - **Display Name:** The name guests see, if applicable. This can be a first name or a nickname. Example: **"Alex"** instead of **"Alexander Jonathan Smith III."**
   - **Email:** The photographer's email address. This is used for login and notifications.
   - **Phone:** Mobile number for shift alerts and emergencies.
   - **Employee ID:** Optional. If your studio uses employee IDs, enter it here.
   - **Hire Date:** The date the photographer started. This affects payroll and benefits calculations.
5. Click **Save**.
6. The photographer is added to the list. They will receive an email with login instructions.
7. To assign the photographer a photo kit or equipment, click their name in the list, then click the **Equipment** tab, and click **Assign Kit**.

💡 **Tip:** If the photographer does not receive the welcome email within 10 minutes, ask them to check their spam folder. If it is not there, click the **Resend Welcome Email** button on their profile page.

⚠️ **Warning:** Do not create multiple photographer accounts for the same person. If a photographer works at two of your studios, use the same email address. ClickFlash will link their accounts across locations.

## 4.6 Managing Disk Space

Photos take up space. A lot of space. One high-resolution photo can be 10 to 30 megabytes. After a busy weekend, your Master computer can fill up quickly. If the disk is completely full, ClickFlash cannot ingest new photos or process new orders.

### Step-by-step: Check disk space

1. On the Dashboard, look at the **Disk Space** card.
2. It shows a percentage, such as **"72% full"**, and an estimate of how many days of photos remain at your current volume.
3. If the percentage is below 70%, you are fine. Do nothing.
4. If the percentage is 70% to 85%, plan to archive old photos soon. See below.
5. If the percentage is above 85%, you must free up space today.
6. If the percentage is above 95%, stop everything and free up space immediately. No new photos can be saved.

### Step-by-step: Free up disk space by archiving old albums

1. Click **Albums** in the left-hand menu.
2. At the top of the page, click the **filter icon** and select **Date range**.
3. Choose a date range that is older than your studio's retention policy. For example, if your policy says you keep photos for 90 days, select a range that is more than 90 days old.
4. Click **Apply Filter**.
5. You now see a list of old albums. Click the **checkbox** in the header row to select all albums on the page.
6. Click the **Archive** button that appears in the toolbar.
7. A dialog asks you to confirm. It will say: **"Archive 47 albums? These will be moved to cloud storage and removed from the local disk. They can be restored later if needed."**
8. Click **Confirm Archive**.
9. The system moves the albums to the Cloud Hub. This may take several minutes depending on the number of photos and your internet speed. A progress bar appears.
10. When the archive is complete, the **Disk Space** card updates to show the new percentage.

💡 **Tip:** Archiving does not delete photos. It moves them to cheaper, slower cloud storage. If a guest comes back six months later asking for a reprint, you can restore the album from the archive. It takes about 5 minutes to restore.

⚠️ **Warning:** Never delete photos using the system file explorer or the Windows Recycle Bin. ClickFlash will not know they are gone, and the database will contain broken links. Always use the **Archive** button inside ClickFlash.

### If you need to restore an archived album

1. Click **Albums** in the left-hand menu.
2. Click the **Archived** tab at the top of the page.
3. Use the search bar to find the album by name, date, or guest name.
4. Click the **Restore** button next to the album.
5. The system downloads the album from the cloud. This takes 2 to 10 minutes.
6. When the download is complete, the album appears in the main album list again, and guests can browse it on the kiosks.

---

# 5. When Something Goes Wrong

This chapter is your emergency playbook. It contains five common problems and exactly what to do about them. Keep this chapter bookmarked. When something breaks, you do not want to guess.

## 5.1 Reading the Dashboard

The Dashboard is your early warning system. Before we get into specific problems, here is how to read the warning signs.

### Status Panel colors

| Color | Meaning | Your Action |
|-------|---------|-------------|
| **Green** | Everything is working. | None. You are good. |
| **Yellow** | Something is in progress or mildly delayed. | Watch it. If it does not turn green in 10 minutes, investigate. |
| **Red** | Something is broken or stopped. | Act now. Do not ignore red indicators. |
| **Gray** | The system does not know the status yet. | Wait 2 minutes. If it stays gray, refresh the page or restart the application. |

### Where to look for details

When a status dot is red or yellow, click it. A detail panel slides out showing:

- The exact error message
- The last successful time this feature worked
- A suggestion for what to do next
- A **Run Diagnostics** button that tests the component and tells you if the problem is on your end or the cloud end

## 5.2 The Touch Kiosk Is Offline (Red Bar)

**What you see:** On the Dashboard, the **Touch Online** dot is red. On the kiosk itself, the screen may be black, frozen, or showing a red banner at the top that says **"Offline — cannot reach Master."**

**What it means:** The kiosk cannot talk to the Master computer. This usually means guests cannot browse or buy photos.

### Step-by-step: Bring a kiosk back online

1. Walk to the kiosk.
2. Check if the screen is on. If it is black, tap it. If it is still black, press the power button on the side.
3. If the screen is on but shows the red **Offline** banner, look at the kiosk's network icon. It is usually in the lower-right corner of the screen.
   - If the icon shows a **Wi-Fi symbol with an X**, the kiosk is not connected to the network.
   - If the icon shows a **Wi-Fi symbol with full bars**, the kiosk is connected to Wi-Fi but cannot reach the Master.
4. If the kiosk is not connected to Wi-Fi:
   - Tap the **gear icon** in the lower-right corner.
   - Enter the **kiosk admin PIN**.
   - Tap **Network Settings**.
   - Select your studio's Wi-Fi network from the list.
   - Type the Wi-Fi password. This is usually printed on a sticker on the router or in your studio binder.
   - Tap **Connect**.
   - Wait 10 seconds. The kiosk should reconnect and the red banner should disappear.
5. If the kiosk is connected to Wi-Fi but still shows the red banner:
   - The problem is on the Master side, not the kiosk side.
   - Return to the Master computer.
   - Check the **Internet** dot on the Dashboard. If it is red, your studio has no internet. See Section 5.5.
   - If the **Internet** dot is green, click the **Touch Online** red dot on the Dashboard.
   - Click **Restart Kiosk Connection**.
   - Wait 30 seconds. The kiosk should reconnect.
6. If the kiosk still does not come online after these steps, call L1 support. Tell them:
   - The kiosk name or number (e.g., **"Touch Kiosk #2 in the lobby"**)
   - The error message on the screen
   - What you already tried

⚠️ **Warning:** If a kiosk is offline during business hours, you are losing orders. If you cannot fix it in 5 minutes, put a sign on the kiosk that says **"Temporarily out of order. Please see the front desk for assistance."** Then help guests at the Master computer.

💡 **Tip:** If you have multiple kiosks and only one is offline, the problem is almost always that specific kiosk or its Wi-Fi connection. If all kiosks are offline at the same time, the problem is almost always the Master computer or the studio's internet.

## 5.3 Photos Are Not Appearing After Ingest

**What you see:** A photographer plugged in an SD card. The notification said **"Ingest complete,"** but the photos do not show up in the album list, or the album is empty.

**What it means:** The ingest process started but did not finish successfully, or the photos are in a format ClickFlash does not recognize.

### Step-by-step: Troubleshoot missing photos

1. Click **Albums** in the left-hand menu.
2. Look at the very top of the list. Is there a new album with today's date and the photographer's name? If yes, click it. The photos might be there but the thumbnails are slow to generate.
3. If the album is there but empty, or if the album is not there at all, click **Events** in the left-hand menu.
4. Look for a red or yellow event related to the ingest. It will say something like **"Ingest failed: unsupported format"** or **"Ingest error: disk write timeout."**
5. Click the event to see the full error message.
6. If the error says **"Unsupported format"** or **"Unknown file type":**
   - The photographer may have shot in a format other than JPEG or RAW. ClickFlash supports JPEG, PNG, TIFF, and most common RAW formats. HEIC from some iPhones may need a conversion setting enabled. Call L2 support to enable HEIC support if needed.
   - Ask the photographer to confirm what camera settings they used.
7. If the error says **"Disk write timeout"** or **"Out of disk space":**
   - See Section 4.6 for disk space management. Free up space, then try the ingest again.
8. If the error says **"Duplicate album"** or **"Album already exists":**
   - The photographer may have already ingested this card today, or they may have re-used a card without formatting it. Search for the album by date and photographer name. The photos are probably already there.
9. If there is no error in the Events log, or if the error is not clear:
   - Try the SD card again. Insert it into the card reader.
   - Watch the ingest progress bar closely. Does it stop at a specific percentage?
   - If it stops at the same place every time, one specific photo on the card is corrupted. The photographer can review the card on their camera and delete the bad photo.
10. If none of the above steps work, call L2 support. They can remotely inspect the ingest logs and tell you exactly what happened.

⚠️ **Warning:** Do not tell the photographer to "just take the photos again." That is not a solution. The photos are on the card. The problem is almost always a software or settings issue, not a photography issue. Find the root cause.

💡 **Tip:** If the photographer shoots in RAW + JPEG mode (both formats at once), ClickFlash may only ingest the JPEG by default. This is usually what you want, because JPEGs are smaller and load faster on kiosks. If you need the RAW files for editing or large-format printing, ask L2 support to enable RAW ingestion for that photographer's account.

## 5.4 A Guest's Payment Failed

**What you see:** An order on the Master shows status **Failed**. On the kiosk, the guest sees a message like **"Payment declined. Please try a different card."**

**What it means:** The payment processor could not charge the guest's card. This is usually a card issue, not a ClickFlash issue, but you need to handle it gracefully.

### Step-by-step: Help a guest with a failed payment

1. Stay calm. The guest may be embarrassed or frustrated. Reassure them: "This happens sometimes. Let's figure it out together."
2. On the kiosk, tap **Try Again**.
3. Ask the guest to try the same card again. Sometimes it is a temporary network glitch.
4. If it fails again, ask the guest if they have a different card.
5. If they have a different card, guide them to enter the new card information.
6. If the second card also fails, the problem may be the kiosk's card reader, not the cards.
7. To test the card reader, try a small test transaction at the Master computer. Click **Orders**, then **New Test Order**, enter a small amount like `1.00`, and swipe a known-good card. If this also fails, the card reader is broken.
8. If the test transaction works on the Master but fails on the kiosk, the kiosk's card reader may be disconnected or faulty. Check the cable or call L1 support for a hardware swap.
9. If the guest has no other card and the card reader is working, you can offer to:
   - Take cash and create a manual cash order on the Master. Click **Orders**, **New Cash Order**, and follow the prompts.
   - Email the guest an invoice they can pay online later. Click **Orders**, **Send Invoice**, and enter their email address.
   - Hold the order and let them come back later with a different payment method. Use the **Hold Order** button.
10. After the situation is resolved, check the **Events** log for any payment gateway errors. If you see repeated failures across multiple guests, call L2 support. There may be an issue with your payment processor account.

⚠️ **Warning:** Never tell a guest their card is "bad." That is rude and often inaccurate. Instead say, "The card reader is having trouble reading this card. Let's try another way." This keeps the interaction positive and professional.

💡 **Tip:** If a guest is in a hurry and the line is long, offer to create a cash order on the Master and let them pay at the desk. This takes 60 seconds and gets them out the door happy. You can always adjust the order later if needed.

## 5.5 The Internet Is Down (Local Mode)

**What you see:** On the Dashboard, the **Internet** dot is red. On the kiosk, a yellow banner says **"Running in local mode. Some features limited."** Guests may not be able to pay with card, or digital downloads may be unavailable.

**What it means:** Your studio has lost its internet connection. ClickFlash is designed to keep working without internet, but some features are restricted.

### What works in Local Mode

- Guests can browse photos on the kiosk.
- Guests can build orders and add items to their cart.
- Photographers can ingest photos from SD cards. The photos are saved to the Master.
- The Master Dashboard works normally, except for cloud-dependent features.
- You can print receipts from the local printer.

### What does NOT work in Local Mode

- Credit card payments. The card reader needs internet to communicate with the bank.
- Digital download delivery. Guests cannot receive download links by email until the internet returns.
- Cloud sync. New orders and photos are saved locally but not backed up to the cloud yet.
- MoneyTrash marketplace access.
- Remote monitoring from the Cloud Hub.

### Step-by-step: Confirm the outage and switch to cash

1. Look at the **Internet** dot on the Dashboard. Click it to see the error detail. It usually says **"No internet connection. Check router or contact ISP."**
2. Check your phone or another device. Can it access websites? If yes, the problem is the Master computer's network connection, not the whole studio internet.
3. If the whole studio internet is down, check the router. Is it plugged in? Are the lights on? Try unplugging the router for 10 seconds, then plugging it back in. Wait 2 minutes for it to reconnect.
4. If the router reboot does not fix it, call your internet service provider (ISP). They may have an outage in your area.
5. While the internet is down, switch to **cash-only mode**:
   - Put a sign on the kiosks: **"Cash only — cards temporarily unavailable. Please see the front desk."**
   - Place a similar sign at your desk.
   - Accept cash orders on the Master. Click **Orders**, **New Cash Order**, and process the order as usual. The system will queue the order for cloud sync when the internet returns.
6. If a guest absolutely needs to pay by card and the internet is down, you have two options:
   - Take their phone number and call them when the internet returns. Use the **Hold Order** button.
   - Use a mobile hotspot from your phone as a temporary internet connection. This is not ideal for heavy use, but it works for a few card transactions. Connect the Master to the hotspot Wi-Fi, process the payment, then disconnect.
7. When the internet returns, the **Internet** dot turns green. Click **Sync Now** to push all queued orders and photos to the cloud immediately. This prevents the backup from getting too far behind.

⚠️ **Warning:** Do not let the internet stay down for an entire day without action. If the internet is down for more than 4 hours, you risk losing queued data if the Master computer has a problem. Prioritize getting internet restored, even if it means using a temporary hotspot.

💡 **Tip:** During a long outage, keep a manual log of cash orders on paper. Write down the guest name, order items, amount, and time. If the Master fails before the sync completes, you can recreate the orders from your log. This is a last resort, but it has saved studios during major outages.

## 5.6 Forgot Password

**What you see:** You cannot log in. The password you are typing does not work. You are locked out.

### Step-by-step: Recover access

1. Make sure you are typing the password correctly. Passwords are case-sensitive. Check that **Caps Lock** is off.
2. Try typing the password into a text editor like Notepad to see exactly what keys are registering. Sometimes a keyboard has a stuck key or a language layout switched.
3. If you are sure the password is wrong, ask another administrator at your studio to reset it for you. They can do this from the **Staff** page on their own login.
4. If there are no other administrators, or if you are the only administrator, call L2 support. They will verify your identity and reset the password remotely. This usually takes 10 to 15 minutes.
5. After the password is reset, log in with the temporary password provided by support. Immediately change it to your own strong password. See Section 2.3 for the password change steps.

⚠️ **Warning:** Do not try to guess the password repeatedly. After 5 failed attempts, ClickFlash locks the account for 15 minutes as a security measure. This prevents brute-force attacks. If you lock yourself out, wait 15 minutes or call support.

💡 **Tip:** To avoid forgetting passwords in the future, use a password manager or write the password down and store it in a locked drawer. Do not use the same password for ClickFlash that you use for personal accounts like email or social media.

## 5.7 Who Do I Call? — The Escalation Tree

When you have a problem you cannot solve, you need to know exactly who to call. This section gives you the phone numbers and the decision tree.

### The support levels

| Level | Who They Are | What They Handle | When to Call |
|-------|-------------|------------------|--------------|
| **L1 — Help Desk** | First-line support agents. They know ClickFlash well and have scripts for common issues. | Password resets, kiosk offline, printer problems, basic payment issues, how-to questions. | Any business day, 8 AM to 8 PM. |
| **L2 — Engineer** | Technical engineers who can remotely access your system, read logs, and fix software problems. | Ingest failures, repeated payment failures, disk corruption, database errors, advanced configuration changes. | When L1 cannot solve it in 15 minutes, or when the issue is technical. |
| **HQ — On-Call** | Senior engineers and architects at headquarters. They handle emergencies that affect multiple studios or involve data loss. | Complete system failure, data loss, security breach, payment processor outage, major bug. | When L2 says the issue needs escalation, or when multiple studios are affected. |

### Phone numbers

- **L1 Support Desk:** [SUPPORT: +1-800-XXX-XXXX]
- **L2 Technical Engineering:** [SUPPORT: +1-800-XXX-XXXX] (Option 2 from the main menu)
- **HQ On-Call Emergency:** [SUPPORT: +1-800-XXX-XXXX] (Option 9 from the main menu)

### Before you call

Have this information ready. It will speed up the call by 50%.

1. Your **studio name** and **studio ID**. The studio ID is on the **Studio Info** page in the Settings menu.
2. Your **Master software version**. This is in the bottom-left corner of the Dashboard.
3. The **exact error message** or **what the screen shows**. If you can, take a photo of the screen with your phone and text it to the support number.
4. **What you already tried**. This prevents the support agent from making you repeat steps.
5. **When the problem started**. Was it working an hour ago? Did it start after a specific event, like a photographer plugging in a card?

### What to say

Here is a script you can use or adapt:

> "Hello, this is [Your Name] at [Studio Name]. My studio ID is [ID]. I am having a problem with [brief description]. The screen shows [exact error]. I already tried [what you tried]. The problem started at [time]. Can you help me?"

Support agents love this kind of call. It gives them everything they need in 20 seconds.

💡 **Tip:** If the L1 agent puts you on hold for more than 5 minutes, or if they ask you to do something you already did, politely ask to be transferred to L2. You have the right to escalate if the first line cannot help.

⚠️ **Warning:** Do not call the HQ emergency line for routine problems. The HQ team is on-call for serious issues. If you call them for a printer jam, they will transfer you back to L1 and you will waste everyone's time. Use the right level for the right problem.

---

# 6. Monthly Tasks

In addition to your daily routine, there are three tasks you perform once a month. These are important for financial health, compliance, and equipment longevity. Put them on your calendar as recurring appointments.

## 6.1 MoneyTrash Payouts

MoneyTrash is the ClickFlash marketplace where unsold photos from your studio are listed for resale. Other studios, stock photo buyers, or advertisers may purchase rights to use these photos. You earn a payout every time one of your photos sells.

### Step-by-step: Review and claim your MoneyTrash payout

1. On the first day of each month, log in to the Master.
2. Click **MoneyTrash** in the left-hand menu. If you do not see it, click **More** and then **MoneyTrash**.
3. You see a summary card showing **"This month's payout"** and **"Total lifetime earnings."**
4. Click the **Payout Details** button.
5. You see a list of every photo that sold, who bought it, the license type, and the amount earned.
6. Review the list. If any photo looks wrong — for example, a photo of a minor that should not have been listed — click the **Dispute** button next to that item and explain why.
7. If everything looks correct, click **Claim Payout**.
8. The system processes the payout. It usually arrives in your studio's bank account within 3 to 5 business days.
9. The payout is also recorded in the **Financial Reports** section for your accountant.

💡 **Tip:** If your monthly payout is consistently low, you can increase it by opting in more albums to MoneyTrash. By default, only albums older than 30 days are eligible. You can lower this threshold in the **MoneyTrash Settings** page. However, be careful: photos listed on MoneyTrash are visible to buyers outside your studio. Make sure you have model releases for any commercial photos.

⚠️ **Warning:** MoneyTrash payouts are taxable income. The amounts are reported to tax authorities if they exceed the reporting threshold in your jurisdiction. Make sure your accountant sees the monthly payout report. ClickFlash automatically generates a year-end summary for tax purposes.

## 6.2 Photographer Payroll

If your studio pays photographers by the hour, by the session, or by commission, ClickFlash can generate the payroll report for you. This saves hours of manual calculation.

### Step-by-step: Generate the monthly payroll report

1. On the last day of the month, or the first day of the next month, click **Staff** in the left-hand menu.
2. Click the **Payroll** tab.
3. Select the date range: **Start of month** to **End of month**. For example, **06/01/2026** to **06/30/2026**.
4. Click **Generate Report**.
5. The system calculates:
   - Hours worked per photographer (if they clock in and out through ClickFlash)
   - Number of sessions completed
   - Number of photos ingested
   - Commission earned from orders attributed to that photographer
   - Any deductions, bonuses, or adjustments you entered
6. Review the report. Click each photographer's name to see the detailed breakdown.
7. If a number looks wrong, click the **question mark icon** next to it to see which orders or sessions contributed to that number. This lets you verify the calculation.
8. If you need to make an adjustment, click **Add Adjustment** and enter the reason and amount. For example, **"Bonus for covering Saturday shift"** or **"Deduction for broken equipment."**
9. When the report is accurate, click **Export to CSV** or **Export to PDF**. Send the file to your payroll processor or accountant.
10. Click **Mark as Paid** when the payments are actually sent. This records the payment date for tax and audit purposes.

💡 **Tip:** If a photographer disputes their commission, open the detail page and walk through the order list together. ClickFlash attributes orders to photographers based on which album the ordered photo came from. This is usually accurate, but if two photographers shot the same event, you may need to manually split the commission. Use the **Split Commission** button on the order detail page.

⚠️ **Warning:** Payroll reports contain sensitive financial information. Do not email the CSV or PDF to an unsecured address. If your payroll processor requires email, use an encrypted email service or a secure file transfer link. ClickFlash can generate a password-protected PDF if you check the **Password Protect** option before exporting.

## 6.3 Inventory Check

Your studio has physical equipment: cameras, lenses, tripods, lighting, card readers, receipt printers, Touch kiosks, and the Master computer. Once a month, you should verify that everything is present and working.

### Step-by-step: Monthly inventory check

1. Print or open the **Inventory List** from the **Settings** menu, under the **Equipment** tab. This list shows every item registered to your studio.
2. For each camera and lens:
   - Check the serial number against the list.
   - Check that the battery holds a charge.
   - Check that the memory card slot is clean and functional.
   - Mark the item as **Checked** in the list.
3. For each lighting kit and tripod:
   - Check that all pieces are present.
   - Check that bulbs work and batteries charge.
   - Mark as **Checked**.
4. For each Touch kiosk:
   - Check that the screen is clean and responsive.
   - Check that the card reader attached to the kiosk works. Try a test card swipe if the kiosk has a reader.
   - Check that the kiosk is running the latest software version. The version number is in the kiosk's admin menu.
   - Mark as **Checked**.
5. For the Master computer:
   - Check that the disk space is healthy (under 70%).
   - Check that the backup was successful every day of the past month. Go to **Settings > Backup History** and verify there are no red entries.
   - Check that the receipt printer has paper and ink (if applicable).
   - Mark as **Checked**.
6. For any item that is missing, damaged, or not working:
   - Click the **Report Issue** button next to the item in the inventory list.
   - Describe the problem. For example, **"Lens 3 autofocus is stuck."** or **"Kiosk 2 screen has a dead pixel in the upper left."**
   - Submit the report. This automatically creates a ticket with L1 support and notifies the equipment manager.
7. When all items are checked, click **Complete Inventory Check**. The system records the date and your name for the audit trail.

💡 **Tip:** Do the inventory check on a slow day, such as the first Monday of the month. It takes 30 to 45 minutes. Do not try to do it during a busy weekend. Schedule it on your calendar as a recurring meeting so no one books sessions during that time.

⚠️ **Warning:** If you find a damaged camera or lens, take it out of service immediately. Do not let a photographer use it "just one more time." A broken camera can ruin a guest's session, and the resulting bad photos can lead to refunds and negative reviews. Flag it in the inventory system and put a physical **"OUT OF SERVICE"** tag on it.

---

# 7. Glossary

This glossary contains every term used in ClickFlash, in plain English, alphabetically sorted. Use it as a quick reference when you encounter an unfamiliar word in the software or in a support conversation.

| Term | Definition |
|------|------------|
| **Album** | A folder of photos from one session, event, or day. ClickFlash creates albums automatically when photographers ingest photos. |
| **Archive** | Moving old photos from the local Master computer to cloud storage. This frees up disk space. Archived photos can be restored later. |
| **Backup** | A copy of all your data sent to the cloud every night. If the Master computer fails, the backup lets you restore everything. |
| **Cloud Hub** | The website where you manage your studio remotely. Accessible from any browser. Used for reports, settings, and monitoring. |
| **Commission** | A percentage of an order's revenue paid to the photographer who took the photos. Calculated automatically by ClickFlash. |
| **Dashboard** | The main screen on the Master computer. Shows daily numbers, status indicators, and recent activity. |
| **Digital Download** | A product where the guest receives a file of their photo by email, instead of a physical print. |
| **Disk Space** | The amount of storage remaining on the Master computer. Photos consume disk space quickly. |
| **Employee ID** | A unique number assigned to each staff member by your studio's HR system. Optional in ClickFlash. |
| **End-of-Day Backup** | The automatic backup that runs every night after closing. It includes all photos, orders, and settings from the day. |
| **Events Log** | A record of everything that happened in ClickFlash, including errors, warnings, and user actions. Used for troubleshooting. |
| **Full Refund** | Returning 100% of the order amount to the guest's payment method. |
| **Green Indicator** | A status icon on the Dashboard that means a component is working correctly. |
| **Guest** | A customer who visits your studio to have photos taken or to purchase photos. |
| **HEIC** | A photo format used by some Apple devices. ClickFlash may need a setting enabled to support it. |
| **Hold Order** | An order that is saved but not paid. Used when a guest wants to pay later or the payment method is temporarily unavailable. |
| **HQ** | Headquarters. The senior engineering team that handles emergencies affecting multiple studios or involving data loss. |
| **Ingest** | The automatic process of copying photos from an SD card into ClickFlash, creating thumbnails, and making them available for sale. |
| **Invoice** | A payment request sent to a guest by email. The guest pays online, and the order is completed when payment arrives. |
| **Kiosk** | A customer-facing touchscreen device where guests browse photos and place orders. Also called a Touch kiosk. |
| **Kiosk Admin PIN** | A 4-digit code that unlocks the admin menu on a Touch kiosk. Different from the Master password. |
| **L1 Support** | The first level of technical support. Handles common problems like password resets and kiosk offline issues. |
| **L2 Support** | The second level of technical support. Engineers who can remotely access logs and fix software problems. |
| **Local Mode** | The state ClickFlash enters when the internet is down. Some features are limited, but core operations continue. |
| **Master** | The main computer at the studio manager's desk. The central brain of the ClickFlash system. |
| **Memory Card** | A small storage card used in cameras. Also called an SD card. ClickFlash ingests photos from these cards. |
| **Merchandise** | Physical products sold alongside photos, such as mugs, calendars, or framed prints. |
| **MoneyTrash** | The marketplace where unsold photos from your studio are listed for resale to other buyers. You earn payouts from sales. |
| **Offline** | A state where a device cannot communicate with the rest of the system. Usually means a network problem. |
| **Order** | A purchase made by a guest. Can include prints, digital downloads, merchandise, or package bundles. |
| **Partial Refund** | Returning less than 100% of the order amount. Used when only some items are being returned. |
| **Payroll Report** | A monthly summary of hours worked, sessions completed, and commissions earned by each photographer. |
| **Photo Session** | A scheduled period when a photographer takes photos of a guest or group. Also called a shoot or sitting. |
| **Print** | A physical photograph produced on paper. ClickFlash supports multiple print sizes. |
| **RAW** | A high-quality, unprocessed photo format from professional cameras. Larger than JPEG but better for editing. |
| **Receipt** | A printed or emailed confirmation of an order or refund. Contains order details, amounts, and transaction IDs. |
| **Red Indicator** | A status icon on the Dashboard that means a component is broken or needs attention. |
| **Refund** | Returning money to a guest for a cancelled or disputed order. |
| **Restore** | Downloading an archived album from the cloud back to the local Master computer so guests can browse it again. |
| **SD Card** | See Memory Card. A small removable storage card used in cameras. |
| **Screensaver** | A moving image that appears on the Touch kiosk when no one is using it. Tap the screen to wake it. |
| **Seasonal Pricing** | Prices that change based on the time of year, such as higher prices in summer or during holidays. |
| **Session** | See Photo Session. |
| **Staff** | The people who work at your studio, including photographers, managers, and assistants. |
| **Sync** | Short for synchronization. The process of copying data between the Master, Touch kiosks, and Cloud Hub so everything is current. |
| **Thermal Paper** | Special heat-sensitive paper used in receipt printers. It does not use ink. |
| **Thumbnail** | A small, low-resolution version of a photo used for fast browsing. ClickFlash generates these automatically. |
| **Touch** | The customer-facing kiosk system. Guests interact with Touch to browse and buy photos. |
| **Transaction ID** | A unique code assigned to every payment or refund. Used to trace payments with the bank or payment processor. |
| **Wi-Fi** | The wireless network that connects the Touch kiosks to the Master and the internet. |
| **Yellow Indicator** | A status icon on the Dashboard that means something is in progress or mildly delayed. Watch it. |

---

# 8. Index

## A

- **Adding a photographer**: Section 4.5
- **Albums**: Glossary, Section 3.2, Section 4.6
- **Archive (photos)**: Section 4.6
- **Auto-ingest**: Section 3.2

## B

- **Backup**: Section 3.4, Section 6.3
- **Backup history**: Section 6.3

## C

- **Changing password**: Section 2.3
- **Cloud Hub**: Section 1.1, Glossary
- **Commission**: Section 6.2, Glossary
- **Common tasks**: Chapter 4
- **Create order**: Section 4.1

## D

- **Dashboard**: Section 2.4, Section 3.1, Section 5.1
- **Daily routine**: Chapter 3
- **Disk space**: Section 3.1, Section 4.6, Glossary
- **Digital download**: Glossary

## E

- **End-of-day backup**: Section 3.4, Glossary
- **Escalation tree**: Section 5.7
- **Events log**: Section 5.3, Glossary

## F

- **Failed payment**: Section 5.4
- **First 5 minutes**: Chapter 2
- **First-time login**: Section 2.2
- **Forgot password**: Section 5.6
- **Free up disk space**: Section 4.6

## G

- **Guest photo request**: Section 4.1
- **Glossary**: Chapter 7

## H

- **Handling refunds**: Section 4.3
- **Hold order**: Section 5.4, Glossary

## I

- **Index**: Chapter 8
- **Ingest**: Section 3.2, Glossary
- **Internet down**: Section 5.5
- **Inventory check**: Section 6.3
- **Invoice**: Section 5.4, Glossary

## K

- **Kiosk**: Section 1.1, Glossary
- **Kiosk admin PIN**: Section 2.5, Glossary
- **Kiosk offline**: Section 5.2

## L

- **Local mode**: Section 5.5, Glossary
- **Logging in**: Section 2.2
- **L1 support**: Section 5.7, Glossary
- **L2 support**: Section 5.7, Glossary

## M

- **Master computer**: Section 1.1, Section 2.1, Glossary
- **Memory card**: Section 3.2, Glossary
- **Merchandise**: Glossary
- **MoneyTrash**: Section 1.1, Section 6.1, Glossary
- **Monthly tasks**: Chapter 6
- **Morning dashboard check**: Section 3.1

## O

- **Offline**: Section 5.2, Glossary
- **Order**: Section 3.3, Glossary
- **Order monitoring**: Section 3.3

## P

- **Partial refund**: Section 4.3, Glossary
- **Password (change)**: Section 2.3
- **Password (forgot)**: Section 5.6
- **Payroll**: Section 6.2
- **Photo request**: Section 4.1
- **Photos not appearing**: Section 5.3
- **Pricing (seasonal)**: Section 4.4
- **Print receipt**: Section 4.2
- **Printer (troubleshooting)**: Section 4.2

## R

- **Receipt**: Section 4.1, Section 4.2, Glossary
- **Red indicator**: Section 3.1, Glossary
- **Refund**: Section 4.3, Glossary
- **Restore (archived album)**: Section 4.6

## S

- **SD card**: Section 3.2, Glossary
- **Seasonal pricing**: Section 4.4
- **Status panel**: Section 2.4, Section 3.1, Section 5.1
- **Support phone numbers**: Section 5.7
- **Sync**: Section 3.1, Glossary

## T

- **Thermal paper**: Section 4.2, Glossary
- **Touch kiosk**: Section 1.1, Section 2.5, Glossary
- **Troubleshooting**: Chapter 5
- **Turning on Master**: Section 2.1
- **Turning on Touch**: Section 2.5
- **Turning off Touch**: Section 3.5

## W

- **Welcome**: Chapter 1
- **When something goes wrong**: Chapter 5
- **Who do I call**: Section 5.7

---

## Final Words

Running a photography studio is a lot of work. You are managing people, equipment, guests, money, and technology all at once. ClickFlash is designed to make the technology part invisible, so you can focus on what matters: giving guests a great experience and helping photographers do their best work.

You do not need to memorize this manual. You do not need to be perfect. When you forget a step, come back to this chapter. When something breaks, follow the playbook. When you are unsure, call support. That is what they are there for.

The most important things to remember are:

- **Green means go.** Red means stop and look.
- **Never pull a card during ingest.**
- **Back up every night.**
- **When in doubt, call L1.**
- **You are doing great. ClickFlash is here to help.**

---

*End of Manual*
