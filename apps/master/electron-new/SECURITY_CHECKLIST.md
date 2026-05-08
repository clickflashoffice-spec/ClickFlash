# Security Hardening Checklist

## Electron Security Configuration

### Context Isolation
- [x] `contextIsolation: true` - Enabled in all BrowserWindows
- [x] `nodeIntegration: false` - Disabled in all BrowserWindows
- [x] `sandbox: true` - Enabled for renderer processes
- [x] `webSecurity: true` - Enabled to prevent CORS bypass

### IPC Security
- [x] Channel whitelist validation in preload script
- [x] Zod schema validation for IPC payloads
- [x] Timing-safe comparison for sensitive operations (kiosk PIN)
- [x] No raw `ipcRenderer` exposure to renderer

### Navigation Security
- [x] `will-navigate` handler blocks external navigation
- [x] Only `file://` and `data:` URLs allowed
- [x] `window.open` blocked via `setWindowOpenHandler`
- [x] Context menu disabled in production

### Input Security
- [x] `before-input-event` blocks dangerous shortcuts
- [x] F-keys blocked to prevent DevTools
- [x] Ctrl+R, Ctrl+I, Ctrl+U blocked
- [x] Alt+F4 blocked (Windows)

### Content Security Policy
- [x] Strict CSP headers via Helmet
- [x] `defaultSrc: ["'self'"]`
- [x] Script sources restricted in production
- [x] Connect sources limited to known domains

### Memory Safety
- [x] Proper cleanup of IPC listeners
- [x] BrowserWindow reference cleanup on close
- [x] Process monitoring for memory leaks

### Data at Rest
- [x] SQLite with `better-sqlite3-multiple-ciphers`
- [x] AES-256-GCM encryption for sensitive data
- [x] Encryption keys managed via environment/secrets

### Network Security
- [x] HMAC-SHA256 for Touch Kiosk requests
- [x] Replay prevention with 5-minute timestamp window
- [x] LAN-only enforcement for kiosk traffic
- [x] TLS configuration for production

### Update Security
- [x] Code signing for Windows/Mac executables
- [x] Secure auto-update via GitHub releases
- [x] Signature verification for updates

## Compliance Considerations

### GDPR/CCPA
- [x] Customer photos encrypted at rest
- [x] Data retention policies implemented
- [x] Customer data deletion support

### PCI-DSS (if payment processing)
- [x] Card data never stored locally
- [x] Stripe handles all payment data
- [x] PCI-compliant payment flow

## Testing

### Security Testing
- [x] Playwright tests verify no node APIs in renderer
- [x] IPC channel validation tests
- [x] Navigation blocking tests

### Vulnerability Scanning
- [x] `npm audit` in CI pipeline
- [x] `electronegativity` for Electron-specific issues
- [x] Regular dependency updates

## Deployment

### Production Hardening
- [ ] EV Code Signing Certificate for Windows
- [ ] Apple Developer Certificate for macOS
- [ ] Hardened runtime enabled for macOS
- [ ] Notarization for macOS

### Monitoring
- [ ] Sentry for crash reporting
- [ ] Security event logging
- [ ] Intrusion detection alerts
