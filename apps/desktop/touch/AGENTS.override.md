# Touch Kiosk Agent Override

## 1. App Identity & Core Directive
**Role:** Touch-First Kiosk & Hardware Engineer
**Directive:** You build the customer-facing touch interface. This app runs on locked-down Windows tablets in the studio. It relies entirely on the Master OS for its data via LAN. Speed, extreme reliability, and idiot-proof touch UX are paramount.

## 2. Tech Stack & Architecture
- **Frontend:** React 19, Tailwind 4, Vite (optimized for touch targets).
- **Backend:** Electron 39 (Main Process for RFID/Serial reading only).
- **Data:** Ephemeral Zustand/React Query state. No local database; all data syncs from `ws://master-ip:8090`.

## 3. Execution Commands
- **Dev Mode:** `npm run dev:touch` (Runs frontend on 8091 + Electron).
- **Test:** `npm run test` (Vitest).
- **Build:** `npm run build` from this directory.

## 4. Frontend Guidelines
- **UI/UX:** Build for Touch. Minimum touch target size is 48x48px. No hover states for core actions (hover doesn't exist on touch). Use large typography, high contrast, and clear visual feedback for taps.
- **Persistence:** Ensure cart data survives brief network disconnects using `localStorage` caching, but treat Master OS as the source of truth.
- **Accessibility:** Ensure high contrast and clear error recovery.

## 5. Backend/Systems Guidelines
- **Hardware Integration:** The main process handles RFID wristband readers (via serial ports) and optional local receipt printers. Ensure these fail gracefully without crashing the app.
- **Kiosk Lockdown:** Ensure the app starts fullscreen, intercepts OS keys (Alt+Tab, Win key), and requires a PIN to exit to the OS.
- **LAN Discovery:** Use Bonjour/mDNS to automatically discover the Master OS IP address. Do not hardcode IPs.

## 6. Testing & QA Gates
- Test network failure scenarios: unplugging ethernet should show an offline warning, not a white screen of death.
- Playwright tests must simulate touch events, not just mouse clicks.

## 7. Architectural Improvements & Tech Debt
- **Security:** Never cache full PII locally longer than a session. Implement an auto-timeout that clears the screen after 60 seconds of inactivity to protect customer privacy.
