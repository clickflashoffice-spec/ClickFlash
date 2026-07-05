# ClickFlash Photographer Manual

*The complete guide to shooting, culling, and selling with the ClickFlash Studio OS*

---

Welcome to ClickFlash. If you have ever wondered whether there is a faster way to get photos from your camera into a guest's hands, the answer is yes, and you are already holding it. ClickFlash is a photography studio operating system built for event photographers working at resorts, cruise ships, and destination venues. It handles the boring stuff, leaving you free to focus on what you do best: taking photos that people want to buy.

This manual assumes you are comfortable with iOS-level technology, you know your way around a camera, and you do not need to be told what an SD card is. You do not need to know anything about the command line. If you can drag, drop, and click, you can master this system in one afternoon.

---

## 1. Your Day with ClickFlash: A Daily Workflow Overview

Let us walk through a typical day. You arrive at the resort, check in, and pick up your camera. You shoot an event, a dinner, or a pool party. By the end of the day, you have hundreds of photos on your SD card. In the old world, you would spend hours copying, sorting, renaming, and uploading. In the ClickFlash world, the heavy lifting is already done before you finish your coffee.

Here is what the rhythm looks like:

1. **Shoot the event.** Capture everything. Do not worry about quantity; the system is designed to handle volume.
2. **Ingest your photos.** Plug your SD card into the **Master PC**. ClickFlash automatically imports every image, reads the EXIF data, and drops them into a **Pending** album. Ingesting 200 photos takes less than 3 minutes.
3. **Let the AI cull.** The system scores every image for quality, sharpness, expression, and composition. It suggests the best 40 keepers from your 200 shots. You review the selections in under 10 minutes.
4. **Face-tag the keepers.** ClickFlash detects faces, groups them by person, and shows you which guest appears in which photo. You name the groups and merge any duplicates.
5. **Build and publish the album.** Drag your keepers into a named album, set the pricing tier, add a watermark, and hit **Publish**.
6. **Guests buy on Touch kiosks.** Within minutes, the album appears on the Touch kiosks around the venue. Guests find their photos by room number or by scanning their face.
7. **Get paid.** Every sale is tracked. Unsold photos enter the **MoneyTrash** marketplace after 30 days, and you earn a 40 percent commission on every additional sale.

That is the entire loop. From memory card to marketplace, the photographer's job is reduced to shooting, reviewing, and clicking **Publish**. The rest is automation.

---

## 2. The 3-Step Shoot-to-Share Flow

ClickFlash organizes your work into three macro steps: **Ingest**, **Cull + Tag**, and **Share**. Master these three, and you will move faster than any other photographer on the property.

### 2.1 Step 1: Ingest — From SD Card to Pending

Ingestion is the moment your photos enter the ClickFlash ecosystem. It is fully automated, but you should understand what happens under the hood so you can trust the process.

**What happens during ingest:**

1. Insert your SD card into the **Master PC** card reader.
2. The **Ingest** panel opens automatically. If it does not, click the **Ingest** button in the top toolbar.
3. ClickFlash scans the card and detects all new image files. It ignores files that have already been imported, so you cannot accidentally duplicate a batch.
4. The system copies the files to the Master PC storage, reads the EXIF metadata, and generates thumbnails and previews.
5. All imported photos land in a **Pending** album, organized by date and time of shot.

**Ingest 200 photos in less than 3 minutes.** The speed depends on your card reader and file size, but the system is optimized for RAW and JPEG workflows. If you are shooting JPEG+RAW, the system will import both formats and treat the JPEG as the preview while keeping the RAW available for print-quality exports.

💡 **Pro Tip:** You can start culling while ingestion is still running. ClickFlash processes photos in the background, so you do not need to wait for the entire batch to finish. Open the **Pending** album as soon as the first thumbnails appear and begin your review.

⚠️ **Warning:** Do not remove the SD card while the ingest progress bar is active. If the transfer is interrupted, ClickFlash will flag the affected files, and you may need to re-import the entire batch to guarantee completeness.

### 2.2 Step 2: Cull + Tag — From 200 Shots to 40 Keepers

Culling is where ClickFlash pays for itself. The AI scoring engine evaluates every photo in the **Pending** album and ranks them by technical and aesthetic quality. Your job is to confirm the AI's choices, correct its mistakes, and add face tags so guests can find themselves later.

#### Culling with the AI Panel

1. Open the **Pending** album and switch to the **Culling** panel on the right side.
2. The AI displays a score from 0 to 100 for each photo. Scores above 80 are considered high-quality keepers. Scores below 40 are typically rejected.
3. The AI also flags four common issues:
   - **Duplicate Detection:** Identifies burst sequences and near-identical frames.
   - **Blur Detection:** Flags motion blur or missed focus.
   - **Closed-Eye Detection:** Catches subjects with eyes shut at the moment of capture.
   - **Composition Score:** Evaluates framing, rule of thirds, and background clutter.
4. Review the **Suggested Keepers** tab. The AI pre-selects the top 40 photos from a typical 200-shot batch.
5. Click any photo to open the **Photo Viewer**. Use the zoom and compare tools to inspect details.
6. Approve a keeper by pressing `Space` or clicking the **Approve** button. Reject a photo by pressing `X` or clicking **Reject**.
7. Move through the batch using the **Filmstrip** at the bottom. The filmstrip highlights approved, rejected, and unreviewed photos with color-coded borders.

**Cull to 40 keepers in less than 10 minutes.** The AI does the heavy lifting; your job is quality control. If you disagree with a score, override it. Your human judgment is always the final authority.

💡 **Pro Tip:** If two photos are nearly identical and both scored highly, the **Compare** tool in the Photo Viewer lets you view them side by side. Press `C` to enter compare mode, then use the arrow keys to toggle between the two.

#### Face Tagging the Keepers

Once you have approved your keepers, the next task is face tagging. ClickFlash runs face recognition across the entire approved set and groups detected faces into clusters.

1. Switch to the **Face Recognition** panel in the album view.
2. The system displays **Face Groups**, each containing a collection of similar faces. Each group is labeled **Unknown Guest** by default.
3. Click a face group and type the guest's name. If you do not know the name, use the room number or a temporary identifier like **Pool Party Group A**.
4. Click **Save** to confirm the tag.
5. Repeat for every distinct person in the album.

We will cover face recognition in much more detail in Section 4, including how to fix merge errors and split mixed groups.

### 2.3 Step 3: Share — Publishing to Touch Kiosks

Sharing is the final step. Once your album is built, priced, and watermarked, publishing makes it live.

1. Click **Create Album** in the top toolbar or select **New Album** from the **Albums** view.
2. Give the album a descriptive name, such as **Sunset Beach Dinner — June 12**.
3. Drag your approved keepers from the **Pending** album into the new album. You can reorder them by drag-and-drop.
4. Open the **Pricing** panel and set the tier. ClickFlash supports three default tiers: **Standard**, **Premium**, and **Deluxe**. You can also set custom per-print pricing.
5. Upload a watermark in the **Watermark** panel. The watermark is applied automatically to all previews on the Touch kiosks; full-resolution prints are exported clean.
6. Click **Publish**.
7. The album syncs to the Touch kiosks. Within 2–3 minutes, guests can browse the album by room number or by using the face-scan kiosk.

💡 **Pro Tip:** You can publish an album as a **Draft** first. Draft albums are visible only on the Master PC, so you can show them to the event coordinator for approval before they go live to guests.

---

## 3. The Album Editor: Your Most-Used Tool

The **Album Editor** is where you spend most of your time. It is a single-screen workspace that combines a photo grid, a filmstrip, a culling panel, a face recognition panel, and a pricing panel. Learn this screen, and you will fly through your workflow.

### 3.1 The Layout

When you open an album, the screen is divided into four zones:

1. **Top Toolbar:** Album name, status badge (**Draft**, **Published**, or **Archived**), **Publish** button, and **Settings** menu.
2. **Center Photo Grid:** A scrollable grid of thumbnails. Thumbnails show approval status, star rating, and AI score overlays.
3. **Right Sidebar:** Contextual panels. Use the tabs to switch between **Culling**, **Face Recognition**, **Pricing**, and **Watermark**.
4. **Bottom Filmstrip:** A horizontal strip of all photos in the album. Click any thumbnail to open it in the Photo Viewer.

### 3.2 Photo Grid: Selection, Reordering, and Bulk Actions

The photo grid is your command center.

1. **Select a photo:** Click any thumbnail. Selected photos get a blue border.
2. **Multi-select:** Hold `Shift` and click to select a range, or hold `Ctrl` and click to select individual photos.
3. **Drag to reorder:** Click and drag any thumbnail to a new position. The order you set here is the order guests see on the Touch kiosks.
4. **Bulk actions:** Select multiple photos, then right-click to see options:
   - **Approve All**
   - **Reject All**
   - **Add to Album**
   - **Remove from Album**
   - **Set Star Rating**
5. **Star ratings:** Each thumbnail supports 1–5 star ratings. Press `1` through `5` on your keyboard to rate the selected photo. Stars are for your internal reference; they do not affect the guest-facing album.

💡 **Pro Tip:** The default album order is chronological by capture time. For storytelling impact, try reordering photos to create a mini-narrative: establishing shot, interaction shots, peak emotion, closing shot.

### 3.3 Photo Viewer: Zoom, Compare, and Inspect

Double-click any thumbnail to open the **Photo Viewer**. This is a full-screen modal with precision tools.

1. **Zoom:** Scroll with your mouse wheel or press `+` and `-` to zoom in and out. At 100% zoom, you can inspect focus accuracy on the eyes.
2. **Pan:** Click and drag to move around the zoomed image.
3. **Compare:** Press `C` to enter compare mode. The screen splits into two halves. Click any other photo in the filmstrip to load it on the right side. This is ideal for choosing between two similar frames.
4. **EXIF Display:** Press `E` or click the **EXIF** button to toggle a metadata overlay. You will see camera model, lens, aperture, shutter speed, ISO, and focal length.
5. **Flag / Reject:** Press `Space` to approve or `X` to reject. The status updates instantly in the filmstrip and grid.

⚠️ **Warning:** Rejecting a photo in the Photo Viewer does not delete the file. It only marks it as excluded from the album. If you reject a photo by mistake, you can find it in the **Rejected** filter and restore it with `Space`.

### 3.4 Pricing Panel: Setting Tiers and Watermarks

The **Pricing** panel controls how guests purchase photos from the Touch kiosks.

1. Open the **Pricing** tab in the right sidebar.
2. Select a **Pricing Tier** from the dropdown:
   - **Standard:** Single digital download.
   - **Premium:** Digital download + one 8x10 print.
   - **Deluxe:** Full digital gallery + three prints of any size.
3. To override the default prices, enable **Custom Pricing** and enter your values per item.
4. Switch to the **Watermark** tab. Upload a PNG file with transparency. The watermark is tiled across all kiosk previews at 15% opacity.
5. Toggle **Apply to Album** to confirm the watermark for this album only. Global watermarks can be set in **Settings > Watermarks**.

💡 **Pro Tip:** Watermarks are a psychological nudge. A subtle watermark in the corner of the kiosk preview encourages guests to buy the clean, full-resolution version. Do not make the watermark so aggressive that it ruins the preview; you want guests to imagine the photo on their wall.

### 3.5 Status Badges and Album Lifecycle

Every album has a status badge that controls its visibility:

- **Draft:** Visible only on the Master PC. Use this for review and internal collaboration.
- **Published:** Live on Touch kiosks. Guests can browse, search, and purchase.
- **Archived:** Removed from kiosks but preserved in the system. Archived albums are still searchable by staff and can be restored to Published if needed.

To change status, click the badge in the top toolbar and select the new status. Changes take effect on the kiosks within 2–3 minutes.

---

## 4. Face Recognition: How It Works, How to Fix Mistakes

Face recognition is the secret sauce that makes ClickFlash feel magical to guests. When a guest walks up to a Touch kiosk and scans their face, the system finds every photo they appear in, across every album on the ship or resort. Getting the tagging right is therefore critical to sales.

### 4.1 How It Works

ClickFlash uses on-device neural networks to detect and encode faces. The process happens in three stages:

1. **Detection:** The system finds every face in every photo. Detection works on profile views, partial obstructions, and varying lighting conditions.
2. **Encoding:** Each detected face is converted into a numerical vector, a mathematical fingerprint that describes the unique features of that face.
3. **Clustering:** The system compares all vectors and groups similar faces together. These groups become **Face Groups** in the UI.

The entire process runs on the Master PC. No face data is ever uploaded to external servers, and no biometric information leaves the property. Privacy is built into the architecture.

### 4.2 Naming Face Groups

When you open the **Face Recognition** panel for the first time, you will see a grid of unnamed face groups.

1. Click a face group. The panel expands to show every photo in that group.
2. Look at the face thumbnails. If they all belong to the same person, type the guest's name or room number into the **Name** field.
3. Click **Save**.
4. The name propagates across all photos in that group. When a guest searches by name or scans their face at a kiosk, the system returns all photos linked to that group.

💡 **Pro Tip:** If you do not know a guest's name, use the room number as a temporary placeholder. Room numbers are easy to cross-reference with the front desk later, and they make the kiosk search functional immediately.

### 4.3 Merging Face Groups

Sometimes the AI splits one person into two or more groups. This happens when lighting, angle, or expression changes significantly between shots. Merging is the fix.

1. In the **Face Recognition** panel, click the **Merge** tab.
2. Select the two or more groups that belong to the same person. Hold `Ctrl` while clicking to select multiple groups.
3. Click **Merge Groups**.
4. The system combines the vectors into a single group and renames all associated photos.

⚠️ **Warning:** Merging is permanent. Once two groups are combined, they cannot be unmerged automatically. If you make a mistake, you will need to manually split the group using the **Split** tool described below. Always verify the face thumbnails before confirming a merge.

### 4.4 Splitting Mixed Groups

The opposite problem is also common: two different guests end up in the same face group because they have similar bone structure or are wearing identical outfits (uniforms, wedding parties, sports teams).

1. Click the mixed group to open it.
2. Click the **Split** tab.
3. The system displays every face in the group as a grid of thumbnails.
4. Click each face that belongs to **Guest A**. Selected faces get a blue highlight.
5. Click **Create New Group from Selection**.
6. Name the new group **Guest A**.
7. The remaining faces automatically stay in the original group. Rename that group to **Guest B**.

💡 **Pro Tip:** Mixed groups are most common at events where guests wear matching attire, such as weddings, corporate retreats, or team sports. If you anticipate this, manually review face groups before publishing those albums. A five-minute review at the Master PC saves hours of guest complaints at the kiosk.

### 4.5 Accuracy and Confidence Thresholds

ClickFlash shows a confidence score for every face group match. Scores above 90% are almost always correct. Scores between 70% and 90% should be reviewed manually. Scores below 70% are flagged as **Low Confidence** and hidden from the guest search by default.

To adjust the threshold, go to **Settings > Face Recognition** and change the **Minimum Confidence** slider. Lower thresholds increase recall but may introduce false matches. Higher thresholds improve precision but may miss some photos of a guest. The default setting of 75% is tuned for resort environments.

---

## 5. MoneyTrash: What It Is, When It Kicks In, How You Get Paid

Not every photo sells on the first day. That is expected. What ClickFlash does differently is turn your unsold inventory into a second chance at revenue.

### 5.1 What Is MoneyTrash?

**MoneyTrash** is an automated marketplace for unsold photos. After an album has been live on the Touch kiosks for 30 days, any photos that have not been purchased are eligible to enter the MoneyTrash marketplace. There, they become available to other guests, general visitors, or even future events at a discounted price.

Think of it as a clearance rack for digital photos. The guest who originally appeared in the photo may not have bought it, but another guest might love it as a candid shot of the atmosphere.

### 5.2 When It Kicks In

The timeline is fully automated:

1. **Day 0:** You publish an album. Photos are available at full price on Touch kiosks.
2. **Day 1–30:** Guests browse and purchase. Every sale is tracked in real time.
3. **Day 31:** Unsold photos automatically transition to **MoneyTrash** status. The system applies a discount, typically 50% off the original pricing tier.
4. **Day 31+:** Photos remain in the MoneyTrash marketplace indefinitely, or until you manually archive the album.

You do not need to do anything to trigger this. The system runs a nightly batch job that evaluates every published album and moves eligible photos to the marketplace.

### 5.3 How You Get Paid

You earn a **40% commission** on every MoneyTrash sale. Here is how the math works:

1. A guest buys a photo from the MoneyTrash marketplace for $10 (discounted from the original $20).
2. ClickFlash retains 60% to cover kiosk hosting, payment processing, and platform operations.
3. You receive 40%, which is $4 in this example.
4. Earnings are accumulated in your **Photographer Dashboard**.

To view your earnings:

1. Open the **Photographer Dashboard** from the main menu.
2. Click the **Earnings** tab.
3. Filter by **Album Sales**, **MoneyTrash Sales**, or **Total**.
4. Click **Export** to download a CSV for your records.

Payouts are processed weekly to the bank account on file. If you need to update your payout details, go to **Settings > Account > Payout Information**.

💡 **Pro Tip:** The best way to increase MoneyTrash revenue is to shoot atmosphere and group photos, not just individual portraits. A photo of a dance floor or a sunset toast has value to multiple guests, even if the primary subjects never buy it. These ambient shots are the unsung heroes of the marketplace.

⚠️ **Warning:** Photos that are **Rejected** or manually excluded from the album during culling are never sent to MoneyTrash. If you reject a great atmospheric shot because it does not fit the main album, consider creating a secondary album for "Venue Atmosphere" and publishing it separately. That way, the photo gets its shot at both primary and secondary sales channels.

---

## 6. Troubleshooting: 5 Common Issues

Even the smoothest system hiccups now and then. Here are the five problems photographers encounter most often, and exactly how to fix them.

### 6.1 Issue: Ingest Stalls or Freezes

**Symptom:** The ingest progress bar stops moving, or the application becomes unresponsive after inserting an SD card.

**Fix:**

1. Do not remove the SD card. Wait 60 seconds to see if the process resumes.
2. Check the **Ingest Log** by clicking **View Log** in the ingest panel. Look for errors related to file corruption or unsupported formats.
3. If the log shows a corrupt file, note the filename and click **Skip Corrupt Files** to continue the ingest.
4. If the entire application is frozen, press `Ctrl + Shift + R` to reload the interface without restarting the Master PC.
5. After the reload, eject and reinsert the SD card. ClickFlash will resume the ingest from where it left off.

⚠️ **Warning:** If you force-quit the application during ingest, the partially copied files may be left in an inconsistent state. Always use the **Skip** or **Reload** options first.

### 6.2 Issue: AI Culling Rejects Too Many Good Photos

**Symptom:** The AI suggests only 20 keepers from a 200-shot batch, or it rejects photos that are clearly sharp and well-composed.

**Fix:**

1. Open the **Culling Settings** in the right sidebar.
2. Adjust the **Quality Threshold** slider. The default is 75. Lower it to 60 or 65 to allow more photos through.
3. Disable individual detection filters if they are over-triggering. For example, if **Closed-Eye Detection** is flagging guests with naturally narrow eyes, toggle it off for that album.
4. Click **Re-Score Album** to rerun the AI with the new settings.
5. Manually review the updated suggestions. Your overrides are saved per album and do not affect the global AI model.

💡 **Pro Tip:** AI scoring improves over time as the system learns from your overrides. If you consistently override a certain type of shot, such as backlit silhouettes, the model will eventually score them more accurately.

### 6.3 Issue: Face Recognition Misses a Guest Entirely

**Symptom:** A guest scans their face at a Touch kiosk and gets zero results, even though you are certain they were photographed.

**Fix:**

1. Return to the **Master PC** and open the album.
2. Enter the **Photo Viewer** and locate the photo where the guest appears.
3. Zoom in to the guest's face. If the face is extremely small in the frame, turned away, or heavily shadowed, the AI may not have detected it.
4. If the face is visible but not tagged, right-click the face and select **Manual Tag**.
5. Draw a box around the face and assign it to the correct guest or face group.
6. Click **Save** and republish the album. Manual tags sync to the kiosks within minutes.

⚠️ **Warning:** Manual tagging should be used sparingly. If you find yourself adding manual tags for more than 10% of faces in an album, the lighting or shooting conditions may be too challenging for the AI. Consider adjusting your shooting style for that venue: get closer, use more frontal lighting, or reduce motion blur with faster shutter speeds.

### 6.4 Issue: Album Does Not Appear on Touch Kiosks

**Symptom:** You clicked **Publish**, but guests report that the album is not visible on the kiosk screens.

**Fix:**

1. Check the album status badge. It must say **Published**, not **Draft** or **Archived**.
2. Check the **Publish Date**. If you set a future publish date, the album will not appear until that date and time.
3. Verify the kiosk is online. On the Master PC, open **Settings > Kiosks** and check the status indicator for the kiosk in question. A green dot means online; a red dot means disconnected.
4. If the kiosk is online but the album is still missing, click **Force Sync** next to the kiosk name. This pushes the album manifest immediately.
5. If the kiosk is offline, check the network cable or Wi-Fi connection at the kiosk location. Kiosks require a stable LAN connection to the Master PC.

💡 **Pro Tip:** Always test a new album on one kiosk before announcing it to guests. Pick the kiosk closest to the Master PC, publish, and verify the album appears within 3 minutes. This sanity check saves you from fielding complaints later.

### 6.5 Issue: Watermark Looks Wrong on Kiosk Previews

**Symptom:** The watermark is too large, too small, off-center, or appears as a solid block instead of a transparent overlay.

**Fix:**

1. On the Master PC, open the album and go to the **Watermark** panel.
2. Verify that your watermark file is a **PNG with transparency**. JPEG files or PNGs without an alpha channel will render as solid rectangles.
3. Check the **Watermark Size** setting. The default is 15% of the image width. For subtle branding, try 10%. For aggressive protection, try 20%.
4. Check the **Position** setting. Options are **Center**, **Bottom-Right**, **Bottom-Left**, **Top-Right**, and **Top-Left**.
5. Click **Preview on Kiosk** to simulate exactly how the watermark will look on the Touch kiosk screen.
6. Adjust until the preview looks correct, then click **Apply to Album**.

⚠️ **Warning:** Watermark changes require a republish to sync to kiosks. Click **Publish** again after any watermark adjustment, even if the album is already live.

---

## 7. Keyboard Shortcuts Cheat Sheet

Master these shortcuts and you will never touch the mouse during culling again. Print this page and tape it to your monitor.

### Navigation

| Shortcut | Action |
|---|---|
| `→` or `↓` | Next photo |
| `←` or `↑` | Previous photo |
| `Home` | First photo in album |
| `End` | Last photo in album |
| `F` | Full-screen Photo Viewer |
| `Esc` | Close Photo Viewer / Cancel dialog |

### Culling & Rating

| Shortcut | Action |
|---|---|
| `Space` | Approve / Toggle keeper status |
| `X` | Reject / Exclude from album |
| `1` | Set 1-star rating |
| `2` | Set 2-star rating |
| `3` | Set 3-star rating |
| `4` | Set 4-star rating |
| `5` | Set 5-star rating |
| `0` | Clear star rating |
| `C` | Enter / exit Compare mode |
| `E` | Toggle EXIF overlay |
| `Z` | Zoom to 100% |
| `Shift + Z` | Zoom to fit |
| `+` | Zoom in |
| `-` | Zoom out |

### Album & Workflow

| Shortcut | Action |
|---|---|
| `Ctrl + I` | Open Ingest panel |
| `Ctrl + N` | Create new album |
| `Ctrl + P` | Publish current album |
| `Ctrl + S` | Save current album |
| `Ctrl + Shift + R` | Reload interface (soft restart) |
| `Ctrl + A` | Select all photos in grid |
| `Delete` | Remove selected photo from album (does not delete file) |
| `Shift + Delete` | Permanently delete selected photo (with confirmation) |
| `Ctrl + Z` | Undo last action |
| `Ctrl + Shift + Z` | Redo last action |
| `Ctrl + D` | Duplicate selected album |
| `Ctrl + E` | Export selected photos |

### Face Recognition

| Shortcut | Action |
|---|---|
| `T` | Open Face Recognition panel |
| `M` | Enter Merge mode |
| `S` | Enter Split mode |
| `Ctrl + Enter` | Save face group name |
| `Tab` | Jump to next unnamed face group |
| `Shift + Tab` | Jump to previous unnamed face group |

### Photo Viewer (when open)

| Shortcut | Action |
|---|---|
| `Space` | Play / pause slideshow |
| `R` | Rotate 90° clockwise |
| `Shift + R` | Rotate 90° counter-clockwise |
| `L` | Toggle flag (red flag marker) |
| `U` | Toggle pick (blue pick marker) |
| `G` | Show / hide filmstrip |
| `I` | Show / hide info panel |
| `H` | Show / hide histogram |

---

*End of manual. Happy shooting, and may your keepers be sharp and your sales be plentiful.*

---

**Document Version:** 1.0  
**Last Updated:** June 2026  
**Platform:** ClickFlash Studio OS v4.3  
**Questions?** Contact the ClickFlash support team from the **Help** menu in the Master PC application.
