# Electron Security & Configuration Audit

This document summarizes the comprehensive security and configuration audit performed on the Electron wrappers of the ClickFlash ecosystem: **Master Portal** (`apps/master`) and **Touch Kiosk** (`apps/touch`).

Both apps have been audited against Electron security best practices (context isolation, sandbox policies, IPC whitelists, network security filters, and user privilege restrictions).

---

## 🛡️ Summary Matrix

| Security Control | Master Portal (`apps/master`) | Touch Kiosk (`apps/touch`) | Status |
| :--- | :--- | :--- | :--- |
| **Context Isolation** | Enabled (`contextIsolation: true`) | Enabled (`contextIsolation: true`) | ✅ Secured |
| **Node Integration** | Disabled (`nodeIntegration: false`) | Disabled (`nodeIntegration: false`) | ✅ Secured |
| **Process Sandboxing** | Enabled (`sandbox: true`) | Enabled (`sandbox: true`) | ✅ Secured |
| **Preload IPC Whitelist** | Enforced (Strict array match) | Enforced (Strict array match) | ✅ Secured |
| **Execution Privilege** | Least Privilege (`asInvoker`) | Least Privilege (`asInvoker`) | ✅ Secured |
| **CSP Headers** | Configured via session webRequest | Configured via session webRequest | ✅ Enforced |
| **Remote Window Limits** | Blocked (`setWindowOpenHandler`) | Blocked (`setWindowOpenHandler`) | ✅ Secured |
| **Key Injection Blocks** | Keyboard input intercept handlers | Keyboard input intercept handlers | ✅ Secured |
| **Path Traversal Guards** | Save Dialog sanitization checks | Local API sandboxed file-system | ✅ Secured |
| **Crash Recovery** | `render-process-gone` auto-reload | `render-process-gone` auto-reload | ✅ Resilient |

---

## 🔍 Detail Audit Findings

### 1. Process Isolation & Sandboxing
- **Context Isolation**: By setting `contextIsolation: true` in the `webPreferences` configuration of both apps, Electron ensures that the preload script and Electron internal code run in a separate context from the web page. This prevents websites or raw UI assets from accessing Electron IPC or Node.js APIs directly.
- **Node Integration**: Hard-disabled (`nodeIntegration: false`) to guarantee that any loaded web scripts cannot execute Node.js commands or invoke modules.
- **Renderer Sandboxing**: `sandbox: true` is set, executing the renderer process within a sandboxed environment (using the chromium sandbox mechanism) to prevent OS-level compromise from vulnerable renderer threads.

### 2. Preload Script Whitelisting
Both apps use context bridge APIs to expose specific functions to the renderer context rather than raw Electron/IPC methods.
- **Master Portal Preload**: Exposes `invoke` and `on` calls only if they match a static list of strings:
  - **Invoke whitelist**: `kiosk:unlock`, `kiosk:lock`, `dialog:openDirectory`, `dialog:openFile`, `dialog:saveFile`, and auto-updater options.
  - **Listen whitelist**: `kiosk:show-unlock-dialog`, `updater:*`.
- **Touch Kiosk Preload**: Follows the same strict whitelist protocol, separating the convenience helper bindings and verifying the channel against:
  - **Invoke whitelist**: `exit-kiosk`, `enter-kiosk`, `kiosk:unlock`, `kiosk:lock`, `get-app-version`, `restart-app`, `getPrinters`, `print`, `updater:check`, `updater:status`.
  - **Listen whitelist**: `kiosk:show-unlock-dialog`, `updater:*`.

### 3. Kiosk Mode & Security Locks
- **Brute-Force & Timing Attack Protections**:
  - The kiosk unlock handler checks input against the expected admin PIN (`ADMIN_PIN`) using `crypto.timingSafeEqual()`, preventing timing attacks.
  - A local login tracker locks out any attempts after 5 failures: Master Portal locks for 15 minutes, while Touch Kiosk locks for 60 minutes.
- **Least Privilege Execution**: Both installer/builder specifications (`electron-builder.yml` and `electron-builder.json`) use `requestedExecutionLevel: asInvoker` instead of `requireAdministrator`. This ensures the application starts without prompting for elevated UAC privileges unless explicitly run as administrator.
- **Input Filtering**: WebContents interceptors block keyboard combinations (e.g. `Alt+Tab`, `Alt+F4`, `F1-F12`, `Escape`, `Windows/Super` key) to prevent users from closing or switching out of kiosk mode.

### 4. Network Isolation & Content Security Policy (CSP)
- **Local network isolation (Touch Kiosk)**: The Touch Kiosk implements a network isolation filter (`session.defaultSession.webRequest.onBeforeRequest`) blocking any outbound traffic not targetting the private subnets (`127.0.0.1`, `192.168.x.x`, `10.x.x.x`, `172.16.x.x-172.31.x.x`) or unauthorized port boundaries.
- **Headers Sanitization**: The referer header is stripped from outbound headers to prevent exposing internal URL directories or host structures.
- **CSP Headers**: A comprehensive Content-Security-Policy is set on headers:
  ```http
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: clickflash://; font-src 'self' data:; connect-src 'self' http://localhost:* ...
  ```

### 5. Path Traversal & Integrity Check
- **Directory Escape Prevention**: The `dialog:saveFile` handler inside `electron-main.ts` normalizes incoming default paths and rejects paths referencing system environments or directories (like `C:\Windows`), resetting them to the user's `documents` folder.
- **Guardian Process Verification**: The Master app spawns a secondary OS guardian (`KioskGuardian.exe`) to lock system-level key-hooks. Before executing, it performs a SHA-256 integrity check against the bundled `.sha256` digest to verify the binary has not been tampered with or replaced.

---

## 🛠️ Rebuild Recommendation
The Electron wrappers are highly optimized, secure, and configured with defence-in-depth security policies.
No security modifications or alterations are required. The installers are ready to be compiled.
