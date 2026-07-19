# Customer App Strategy: Web App vs. Native App

When deciding how to deliver photos to the end customer (the guest at the event or the client), the choice between a Web App and a Native Android/iOS App is one of the most critical business decisions.

**For ClickFlash's customer-facing experience, a Mobile-First Web App (PWA) is vastly superior to a Native App.** 

Here is the breakdown of why this is the best business strategy:

## 1. The "Friction" Metric (Conversion Killer)
**The Golden Rule of Event Photography:** Every extra second it takes for a guest to see their photo reduces the chance they will buy an upsell (like the Boomerang Reel or Photobook) by 20%.

* **Web App:** Guest scans a QR code or taps an SMS link -> Instantly sees their stunning photos in Safari/Chrome. Time elapsed: **3 seconds**.
* **Native App:** Guest scans QR code -> Redirected to Play Store -> Clicks Install -> Waits for 50MB download -> Opens App -> Creates Account -> Enters Gallery Code. Time elapsed: **2 to 5 minutes**. (Drop-off rate is massive).

## 2. The 30% "Apple & Google Tax"
If you sell digital goods (like digital photo downloads or premium AI reels) inside a native iOS or Android app, Apple and Google mandate that you use their in-app purchasing system. 
* They take a **15% to 30% cut** of your revenue.
* **Web App:** You can use Stripe directly on your website and pay only **~2.9% + 30¢**, keeping your profit margins intact.

## 3. SEO and Virality
When a customer loves their photo, they want to share a link with their family.
* A **Web App** link (`clicketflash.com/gallery/123`) can be texted, posted to WhatsApp, or shared on Instagram. Anyone who clicks it instantly sees the ClickFlash branding and can buy prints.
* App links are much harder to share effectively if the recipient doesn't have the app installed.

---

## When SHOULD you use a Native App?

While the customer experience should be a Web App, the **Photographer Experience** absolutely should be a Native App (which we are scaffolding right now with Expo/React Native).

**Why Photographers need the Native App:**
1. **Hardware Access:** Connecting to DSLRs via Bluetooth or WiFi Direct.
2. **Background Syncing:** Uploading massive RAW files to the local Master PC reliably in the background without the browser falling asleep.
3. **Offline Resilience:** Photographers need an app that works deep inside a concrete hotel ballroom with zero reception.

## The ClickFlash Architecture Recommendation
1. **`apps/gallery` (Web App):** Keep the customer-facing side entirely on the web. Make it feel exactly like an app (Mobile-first, dark mode, smooth animations) but accessible via a simple link.
2. **`apps/mobile-photographer` (Native App):** Build the native Android/iOS app exclusively as the professional "remote control" for your roaming photographers to sync photos, trigger the Master PC, and manage the event.
