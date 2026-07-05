# ClickFlash Ecosystem — Full Production Test Plan

> **Version:** 1.0.0  
> **Date:** 2026-06-13  
> **Scope:** All 7 apps, all features, all endpoints  
> **Duration:** 2-3 days (full team)  
> **Status:** Ready for execution

---

## 📋 EXECUTIVE SUMMARY

This plan provides exhaustive test coverage for the entire ClickFlash ecosystem. Every feature, every endpoint, every user flow, and every edge case is documented with exact test steps, expected results, and pass/fail criteria.

### Test Coverage

| Category | Apps | Features | Test Cases |
|----------|------|----------|------------|
| **Desktop Apps** | 4 | 40+ | 200+ |
| **Web Apps** | 3 | 25+ | 150+ |
| **Cloud APIs** | 6 | 50+ | 300+ |
| **Kiosk Pairing** | 2 | 10+ | 50+ |
| **Security** | 7 | 15+ | 100+ |
| **Performance** | 7 | 10+ | 70+ |
| **Integration** | 7 | 20+ | 100+ |
| **Total** | **7** | **170+** | **970+** |

---

## 🏗️ TEST ENVIRONMENT SETUP

### Required Hardware

| Item | Quantity | Purpose |
|------|----------|---------|
| Windows 10/11 PC | 2 | Master + Touch testing |
| Windows 10/11 PC (clean) | 1 | Fresh install validation |
| macOS machine | 1 | Cross-platform testing |
| iPad/Tablet | 1 | Touch kiosk customer UI |
| Ethernet cable | 2 | LAN pairing (no internet) |
| Router (no internet) | 1 | Isolated LAN testing |

### Required Software

| Software | Version | Purpose |
|----------|---------|---------|
| Node.js | 20.x | Backend testing |
| npm | 10.x | Package management |
| Git | 2.x | Version control |
| Postman | 10.x | API testing |
| Chrome DevTools | Latest | Frontend debugging |
| Wireshark | 4.x | Network analysis |
| Fiddler | 5.x | HTTP proxy |
| OBS Studio | 30.x | Screen recording |

### Test Data

```bash
# 1. Create test studio
STUDIO_NAME="Test Studio Alpha"
STUDIO_EMAIL="test-alpha@clickflash.local"
ADMIN_PASSWORD="TestPass123!"

# 2. Create test users
PHOTOGRAPHER_EMAIL="photo@test.com"
EDITOR_EMAIL="editor@test.com"
MANAGER_EMAIL="manager@test.com"

# 3. Create test data
- 50 sample photos (various formats: JPG, PNG, HEIC, RAW)
- 5 sample albums
- 10 sample orders
- 3 sample bookings
- 20 sample customers
```

---

## 📱 APP 1: MASTER (Desktop — React + Electron)

### 1.1 Installation & Startup

| # | Test Case | Steps | Expected Result | Pass Criteria |
|---|-----------|-------|-----------------|---------------|
| M-001 | Fresh install | Run `ClickFlash Master OS Setup 4.2.0.exe` on clean PC | Installer completes without errors | Exit code 0, desktop shortcut created |
| M-002 | Auto-launch | Reboot PC after install | App auto-starts | Process visible in Task Manager |
| M-003 | Port binding | Start app, check port 8090 | Server listens on 8090 | `netstat -an \| findstr 8090` shows LISTENING |
| M-004 | Health check | GET `http://localhost:8090/api/health` | Returns `{status: "ok"}` | HTTP 200, JSON response |
| M-005 | Database init | Check `pb_data/` folder | Database file created | `data.db` exists, > 0 bytes |
| M-006 | Migration run | Check logs for migration count | 90+ migrations applied | Log shows "Applied 90 migrations" |
| M-007 | First-run credentials | Check `FIRST_RUN_CREDENTIALS.txt` | File created with credentials | File exists, contains email + password |
| M-008 | Default user creation | Query `users` table | Admin user exists | `SELECT * FROM users` returns 1 row |
| M-009 | Tray icon | Check system tray | ClickFlash icon visible | Icon present, tooltip shows "ClickFlash Master" |
| M-010 | Splash screen | Start app | Splash screen shows for 2-3 seconds | Visible, then transitions to login |

### 1.2 Authentication & Authorization

| # | Test Case | Steps | Expected Result | Pass Criteria |
|---|-----------|-------|-----------------|---------------|
| M-011 | Login with valid credentials | POST `/api/auth/login` with default creds | Returns user + JWT token | HTTP 200, token length > 100 |
| M-012 | Login with invalid email | POST with wrong email | Returns auth error | HTTP 401, "Invalid email or password" |
| M-013 | Login with invalid password | POST with wrong password | Returns auth error | HTTP 401, "Invalid email or password" |
| M-014 | Login with empty fields | POST with `{}` | Returns validation error | HTTP 400, "Email and password required" |
| M-015 | Rate limiting | Attempt 6 logins in 1 minute | 5th+ attempt blocked | HTTP 429, "Too many attempts" |
| M-016 | JWT expiry | Wait 7 days, use old token | Token rejected | HTTP 401, "Token expired" |
| M-017 | Session tracking | Login, check `user_sessions` table | Session recorded | Row exists with token_hash, IP, UA |
| M-018 | Logout | POST `/api/auth/logout` | Session revoked | HTTP 200, session deleted from DB |
| M-019 | Logout all sessions | POST `/api/auth/logout-all` | All sessions revoked | HTTP 200, `user_sessions` empty |
| M-020 | Password change | POST `/api/auth/change-password` | Password updated | Can login with new password |
| M-021 | Password must change | Login with default password | Prompted to change | Modal appears, forced change |
| M-022 | Role-based access | Login as Photographer | Limited menu items | Only Dashboard, Albums, Orders visible |
| M-023 | Admin access | Login as Admin | All menu items visible | Dashboard, Albums, Orders, Settings, etc. |
| M-024 | PIN protection | Enable PIN in settings | PIN modal on startup | Modal appears before login |
| M-025 | PIN brute force | Enter wrong PIN 6 times | 15-minute lockout | "Locked for 15 minutes" message |
| M-026 | PIN recovery | Forget PIN, use admin override | Access restored | Override code works |

### 1.3 Dashboard

| # | Test Case | Steps | Expected Result | Pass Criteria |
|---|-----------|-------|-----------------|---------------|
| M-027 | Dashboard load | Login, navigate to Dashboard | Widgets load | All widgets visible, no spinners > 3s |
| M-028 | Stats accuracy | Compare widget numbers to DB | Numbers match | Revenue = SUM(orders), Orders = COUNT(orders) |
| M-029 | Recent activity | Create order, check dashboard | Order appears in activity feed | Within 5 seconds |
| M-030 | Quick actions | Click "New Album" quick action | Navigates to album creation | URL changes, form loads |
| M-031 | Chart rendering | Check revenue chart | Chart renders with data | Canvas visible, data points present |
| M-032 | Date range filter | Change date range | Stats update | Numbers change, no errors |
| M-033 | Real-time updates | Create order from another session | Dashboard updates | WebSocket pushes update |
| M-034 | Performance | Load dashboard 10 times | Average < 2 seconds | All loads < 2s |

### 1.4 Albums (CRUD)

| # | Test Case | Steps | Expected Result | Pass Criteria |
|---|-----------|-------|-----------------|---------------|
| M-035 | Create album | Click "New Album", fill form, save | Album created | HTTP 200, appears in list |
| M-036 | Album validation | Save with empty name | Validation error | "Album name required" |
| M-037 | Upload photos | Drag 50 photos to album | All photos uploaded | Progress bars complete, 50 items in album |
| M-038 | Photo formats | Upload JPG, PNG, HEIC, RAW | All accepted | Each format visible in album |
| M-039 | Large photo | Upload 50MB photo | Upload succeeds | No timeout, photo visible |
| M-040 | Duplicate photo | Upload same photo twice | Duplicate handled | Warning or skip, no crash |
| M-041 | Photo deletion | Delete photo from album | Photo removed | No longer visible, DB updated |
| M-042 | Album deletion | Delete album with photos | Album + photos removed | Confirm dialog, then deleted |
| M-043 | Album edit | Rename album | Name updated | List reflects new name |
| M-044 | Album sorting | Sort by date, name, size | Order changes | Visual order matches sort criteria |
| M-045 | Album filtering | Filter by date range | Only matching albums shown | Count matches filter criteria |
| M-046 | Album search | Search by name | Matching albums shown | Search results accurate |
| M-047 | Batch operations | Select 10 photos, delete | All 10 deleted | Batch API called, all removed |
| M-048 | Photo metadata | Check EXIF data display | Camera, lens, settings visible | EXIF parsed correctly |
| M-049 | Thumbnail generation | Upload photo, check thumbnail | Thumbnail created | File exists in `thumbnails/` folder |
| M-050 | Face detection | Upload photo with faces | Faces detected | Bounding boxes visible |
| M-051 | AI editing | Apply AI filter to photo | Filter applied | Before/after visible |
| M-052 | Watermark | Add watermark to album | Watermark applied | Visible on all photos |
| M-053 | Album sharing | Generate share link | Link created | URL accessible, photos viewable |
| M-054 | Album export | Export album to ZIP | ZIP created | File downloadable, contains all photos |
| M-055 | Album import | Import from ZIP | Album recreated | Photos, metadata preserved |

### 1.5 Orders (CRUD)

| # | Test Case | Steps | Expected Result | Pass Criteria |
|---|-----------|-------|-----------------|---------------|
| M-056 | Create order | Create order from album | Order created | HTTP 200, appears in orders list |
| M-057 | Order validation | Create with empty customer | Validation error | "Customer required" |
| M-058 | Order items | Add 5 photos to order | 5 items in order | Line items count = 5 |
| M-059 | Order pricing | Calculate total | Total = sum of items + tax | Math correct |
| M-060 | Order status flow | Create → Processed → Shipped → Delivered | Status updates | Each transition works |
| M-061 | Order cancellation | Cancel pending order | Status = Cancelled | Refund initiated (if paid) |
| M-062 | Order refund | Refund paid order | Payment reversed | Stripe refund created |
| M-063 | Order search | Search by customer name | Matching orders shown | Results accurate |
| M-064 | Order filter | Filter by status | Only matching orders shown | Count correct |
| M-065 | Order export | Export to CSV | CSV created | Columns correct, data accurate |
| M-066 | Order print slip | Generate print slip | PDF created | Contains order details, barcode |
| M-067 | Order fulfillment | Mark as fulfilled | Status updated, customer notified | Email sent, status changed |
| M-068 | Batch orders | Select 10 orders, mark as processed | All updated | Batch API success |
| M-069 | Order analytics | Check revenue by product | Chart renders | Data accurate |
| M-070 | Order timeline | View order history | Timeline visible | All events logged |

### 1.6 Bookings (CRUD)

| # | Test Case | Steps | Expected Result | Pass Criteria |
|---|-----------|-------|-----------------|---------------|
| M-071 | Create booking | Create new booking | Booking created | HTTP 200, calendar updated |
| M-072 | Booking conflict | Create overlapping booking | Conflict warning | "Time slot unavailable" |
| M-073 | Booking reminder | Create booking for tomorrow | Reminder set | Notification scheduled |
| M-074 | Booking cancellation | Cancel booking | Status = Cancelled | Calendar freed |
| M-075 | Booking reschedule | Move to new time | Time updated | No conflicts |
| M-076 | Calendar view | View week/month calendar | Events visible | All bookings displayed |
| M-077 | Calendar drag-drop | Drag booking to new time | Time updated | Drop target highlights |
| M-078 | Recurring booking | Create weekly recurring | Series created | 4 future bookings created |
| M-079 | Booking export | Export to ICS | Calendar file created | Importable to Google Calendar |
| M-080 | Booking sync | Sync with Google Calendar | Events appear in Google | OAuth flow works |

### 1.7 Photographers (CRUD)

| # | Test Case | Steps | Expected Result | Pass Criteria |
|---|-----------|-------|-----------------|---------------|
| M-081 | Add photographer | Create photographer profile | Profile created | HTTP 200, appears in list |
| M-082 | Photographer schedule | Assign bookings | Schedule updated | Calendar shows assignments |
| M-083 | Photographer stats | View performance stats | Charts render | Revenue, bookings, ratings |
| M-084 | Photographer availability | Set unavailable dates | Calendar blocked | Grayed out dates |
| M-085 | Photographer skills | Add skills/tags | Tags visible | Filterable by skill |
| M-086 | Photographer rating | Rate photographer | Average updated | Rating reflects new score |
| M-087 | Photographer payroll | Calculate pay | Amount correct | Hours × Rate = Total |
| M-088 | Photographer export | Export to PDF | PDF created | Resume-style format |

### 1.8 Clients (CRM)

| # | Test Case | Steps | Expected Result | Pass Criteria |
|---|-----------|-------|-----------------|---------------|
| M-089 | Add client | Create client profile | Profile created | HTTP 200, appears in list |
| M-090 | Client history | View client orders | All orders listed | Chronological order |
| M-091 | Client notes | Add note to client | Note saved | Visible in profile |
| M-092 | Client tags | Add tags | Tags visible | Filterable |
| M-093 | Client communication | Send email | Email sent | Resend API called |
| M-094 | Client import | Import from CSV | Clients created | All rows imported |
| M-095 | Client export | Export to CSV | CSV created | All fields included |
| M-096 | Client merge | Merge duplicate clients | Single profile | History combined |
| M-097 | Client birthday | Set birthday | Reminder scheduled | Notification on date |
| M-098 | Client loyalty | Check loyalty points | Points accurate | Sum of order values × rate |

### 1.9 Products (Catalog)

| # | Test Case | Steps | Expected Result | Pass Criteria |
|---|-----------|-------|-----------------|---------------|
| M-099 | Add product | Create product | Product created | HTTP 200, appears in catalog |
| M-100 | Product variants | Add size/color variants | Variants visible | Dropdown shows options |
| M-101 | Product pricing | Set tiered pricing | Prices correct | Quantity breaks applied |
| M-102 | Product inventory | Track stock | Count accurate | Decrements on order |
| M-103 | Product categories | Organize by category | Category filter works | Products grouped |
| M-104 | Product images | Upload product images | Gallery visible | Thumbnails render |
| M-105 | Product description | Rich text editor | HTML saved | Renders correctly |
| M-106 | Product SEO | Set meta tags | Tags saved | Viewable in source |
| M-107 | Product import | Import from CSV | Products created | All rows imported |
| M-108 | Product export | Export to CSV | CSV created | All fields included |
| M-109 | Product bundle | Create bundle | Bundle price = sum - discount | Math correct |
| M-110 | Product discount | Apply discount code | Price reduced | Discount applied at checkout |

### 1.10 Settings (Configuration)

| # | Test Case | Steps | Expected Result | Pass Criteria |
|---|-----------|-------|-----------------|---------------|
| M-111 | Studio info | Update studio name | Name saved | Reflected in UI |
| M-112 | Logo upload | Upload studio logo | Logo visible | Renders in header, emails |
| M-113 | Theme color | Change primary color | Color updated | CSS variables updated |
| M-114 | Currency | Change currency symbol | Symbol updated | Prices show new symbol |
| M-115 | Tax rate | Set tax rate | Tax calculated correctly | 10% rate = 10% added |
| M-116 | Receipt template | Customize receipt | Template saved | PDF uses template |
| M-117 | Email template | Customize email | Template saved | Emails use template |
| M-118 | SMS template | Customize SMS | Template saved | SMS uses template |
| M-119 | Notification prefs | Enable/disable notifications | Preferences saved | Only enabled notifications sent |
| M-120 | Backup settings | Configure auto-backup | Settings saved | Backup runs on schedule |
| M-121 | Cloud sync | Enable cloud sync | Sync starts | Files upload to R2 |
| M-122 | API keys | Generate API key | Key created | Usable for external integration |
| M-123 | Webhook | Configure webhook | Webhook registered | Events POST to URL |
| M-124 | Integrations | Connect Stripe | OAuth flow completes | Connected, payments work |
| M-125 | Integrations | Connect Resend | API key validated | Emails send via Resend |
| M-126 | Integrations | Connect Cloudflare | Credentials validated | Workers deployable |
| M-127 | User management | Add new user | User created | Can login with credentials |
| M-128 | User roles | Assign role | Permissions updated | Menu reflects role |
| M-129 | User deletion | Delete user | User removed | Cannot login |
| M-130 | Session management | View active sessions | Sessions listed | Can revoke individual |

### 1.11 Kiosk Pairing

| # | Test Case | Steps | Expected Result | Pass Criteria |
|---|-----------|-------|-----------------|---------------|
| M-131 | Generate QR code | Open Kiosk Pairing settings | QR code visible | Contains pairing token |
| M-132 | Scan QR code | Scan with Touch app | Pairing initiated | Touch shows "Connecting..." |
| M-133 | Pairing approval | Approve pairing on Master | Touch connected | Status = Connected |
| M-134 | Auto-discovery | Connect via LAN (no internet) | Kiosk discovered | mDNS finds Touch on LAN |
| M-135 | Manual pairing | Enter IP + token manually | Pairing succeeds | Status = Connected |
| M-136 | Folder sync | Set upload folder | Photos sync to Master | Files appear in `uploads/` |
| M-137 | Orders sync | Create order on Touch | Order appears on Master | Within 5 seconds |
| M-138 | Unpair kiosk | Remove kiosk pairing | Disconnected | Status = Disconnected |
| M-139 | Re-pair kiosk | Pair same kiosk again | Reconnected | Previous settings restored |
| M-140 | Multiple kiosks | Pair 3 kiosks | All connected | Dashboard shows 3 kiosks |
| M-141 | Kiosk health | Check kiosk status | Status = Online | Heartbeat < 5 seconds old |
| M-142 | Kiosk offline | Disconnect kiosk | Status = Offline | Detected within 30 seconds |

### 1.12 Reports & Analytics

| # | Test Case | Steps | Expected Result | Pass Criteria |
|---|-----------|-------|-----------------|---------------|
| M-143 | Revenue report | Generate monthly report | Report generated | Numbers match dashboard |
| M-144 | Photographer report | Generate photographer performance | Report generated | Stats per photographer |
| M-145 | Product report | Generate product sales | Report generated | Top products listed |
| M-146 | Custom date range | Set custom range | Report filtered | Only dates in range |
| M-147 | Export report | Export to PDF | PDF created | Charts included |
| M-148 | Export report | Export to Excel | XLSX created | Formulas intact |
| M-149 | Scheduled report | Schedule weekly email | Email sent | Received at scheduled time |
| M-150 | Real-time analytics | Check live dashboard | Numbers update | WebSocket pushes updates |

### 1.13 Backup & Recovery

| # | Test Case | Steps | Expected Result | Pass Criteria |
|---|-----------|-------|-----------------|---------------|
| M-151 | Manual backup | Click "Backup Now" | Backup created | File in `backups/` folder |
| M-152 | Auto backup | Wait for scheduled backup | Backup created | File created on schedule |
| M-153 | Backup encryption | Check backup file | Encrypted | Cannot read without key |
| M-154 | Backup restore | Restore from backup | Data restored | All data present |
| M-155 | Backup verification | Verify backup integrity | Checksum valid | SHA-256 matches |
| M-156 | Cloud backup | Upload to cloud | File in R2 | URL accessible |
| M-157 | Incremental backup | Backup after changes | Only changes uploaded | Size < full backup |
| M-158 | Backup retention | Check old backups | Auto-deleted | Only last 30 days kept |

### 1.14 Auto-Updater

| # | Test Case | Steps | Expected Result | Pass Criteria |
|---|-----------|-------|-----------------|---------------|
| M-159 | Check for updates | Click "Check for Updates" | Version compared | Shows current vs latest |
| M-160 | Download update | Click "Download" | Download starts | Progress bar visible |
| M-161 | Install update | Click "Install" | App restarts | New version running |
| M-162 | Forced update | Critical update available | Auto-download | Notification appears |
| M-163 | Skip update | Click "Skip" | Update deferred | Not prompted for 24 hours |
| M-164 | Update rollback | Update fails | Rollback to previous | App still works |
| M-165 | Offline update | Downloaded update, install offline | Install succeeds | No internet required |

### 1.15 Performance & Stress

| # | Test Case | Steps | Expected Result | Pass Criteria |
|---|-----------|-------|-----------------|---------------|
| M-166 | Startup time | Time from click to login | < 5 seconds | Average of 5 runs |
| M-167 | Album load | Load album with 1000 photos | < 3 seconds | Virtual scroll works |
| M-168 | Photo upload | Upload 100 photos | < 2 minutes | All uploaded, no timeouts |
| M-169 | Concurrent users | 10 users login simultaneously | All succeed | No errors, no crashes |
| M-170 | Memory usage | Monitor RAM during operation | < 500 MB | No memory leaks |
| M-171 | CPU usage | Monitor CPU during photo processing | < 80% | No sustained high CPU |
| M-172 | Database size | Check DB after 10,000 orders | < 100 MB | No bloat |
| M-173 | Long-running | Leave app running for 7 days | No crashes | Memory stable |
| M-174 | Reconnection | Disconnect network, reconnect | Auto-recovers | Sync resumes |
| M-175 | Large dataset | 100,000 photos | App responsive | Pagination works |

### 1.16 Security

| # | Test Case | Steps | Expected Result | Pass Criteria |
|---|-----------|-------|-----------------|---------------|
| M-176 | SQL injection | Input `'; DROP TABLE users; --` | Sanitized | No error, no data loss |
| M-177 | XSS | Input `<script>alert('xss')</script>` | Escaped | Script not executed |
| M-178 | CSRF | Forge request without token | Rejected | HTTP 403 |
| M-179 | Path traversal | Request `../../../etc/passwd` | Rejected | HTTP 403 |
| M-180 | Brute force | 100 login attempts | Rate limited | HTTP 429 after 5 attempts |
| M-181 | JWT tampering | Modify JWT payload | Rejected | Signature invalid |
| M-182 | Privilege escalation | Photographer accesses admin | Rejected | HTTP 403 |
| M-183 | File upload | Upload `.exe` as photo | Rejected | "Invalid file type" |
| M-184 | File size | Upload 1GB file | Rejected | "File too large" |
| M-185 | CORS | Request from unauthorized origin | Rejected | Preflight fails |
| M-186 | HTTPS | Check all API calls | TLS 1.3 | No HTTP calls |
| M-187 | Headers | Check security headers | All present | X-Frame-Options, CSP, etc. |
| M-188 | Encryption | Check database file | SQLCipher | File not readable as text |
| M-189 | Audit log | Perform action, check log | Logged | Action, user, timestamp recorded |
| M-190 | Session timeout | Idle for 30 minutes | Auto-logout | Redirect to login |

---

## 📱 APP 2: TOUCH (Kiosk — React + Electron)

### 2.1 Installation & Startup

| # | Test Case | Steps | Expected Result | Pass Criteria |
|---|-----------|-------|-----------------|---------------|
| T-001 | Fresh install | Run `ClickFlash - Touch Kiosk Setup 4.2.0.exe` | Installer completes | Exit code 0 |
| T-002 | Auto-launch | Reboot PC | App auto-starts | Process visible |
| T-003 | Port binding | Check port 3001 | Server listens | `netstat` shows 3001 |
| T-004 | Kiosk mode | Start app | Full-screen, no window chrome | No title bar, no close button |
| T-005 | Touch optimization | Tap buttons | Responsive | < 100ms response |
| T-006 | Idle timeout | Leave idle for 5 minutes | Returns to attract screen | Attract loop starts |
| T-007 | Attract screen | View attract screen | Slideshow plays | Photos cycle, no UI |
| T-008 | Wake on touch | Tap attract screen | Login screen appears | Transition smooth |

### 2.2 Customer Flow

| # | Test Case | Steps | Expected Result | Pass Criteria |
|---|-----------|-------|-----------------|---------------|
| T-009 | Customer login | Enter session code | Session loaded | Photos from session visible |
| T-010 | Invalid code | Enter wrong code | Error message | "Invalid session code" |
| T-011 | Photo browsing | Swipe through photos | Smooth scroll | 60 FPS, no stutter |
| T-012 | Photo selection | Tap photo to select | Checkmark appears | Visual feedback |
| T-013 | Multi-select | Select 10 photos | All selected | Counter shows 10 |
| T-014 | Deselect | Tap selected photo | Deselected | Checkmark removed |
| T-015 | Select all | Tap "Select All" | All photos selected | Counter = total |
| T-016 | Clear selection | Tap "Clear" | All deselected | Counter = 0 |
| T-017 | Zoom | Pinch to zoom | Photo zooms | Smooth, no pixelation |
| T-018 | Pan | Drag zoomed photo | Photo pans | Follows finger |
| T-019 | Rotate | Rotate device | Layout adjusts | Responsive design |
| T-020 | Add to cart | Tap "Add to Cart" | Cart updated | Item added, total updated |
| T-021 | View cart | Tap cart icon | Cart modal opens | Items listed with prices |
| T-022 | Remove from cart | Tap "Remove" | Item removed | Total updated |
| T-023 | Update quantity | Change quantity | Price recalculated | Math correct |
| T-024 | Apply discount | Enter discount code | Price reduced | Discount applied |
| T-025 | Checkout | Tap "Checkout" | Payment flow starts | Stripe checkout opens |
| T-026 | Payment success | Complete payment | Order confirmed | Receipt shown |
| T-027 | Payment failure | Decline payment | Error shown | Can retry |
| T-028 | Digital download | Select digital option | Download link sent | Email with link |
| T-029 | Print order | Select print option | Order sent to Master | Appears in fulfillment queue |
| T-030 | Order confirmation | Check email | Email received | Contains order details |
| T-031 | Receipt printing | Print receipt | Receipt prints | Thermal printer output |
| T-032 | Session timeout | Idle during checkout | Cart saved | Can resume later |

### 2.3 Kiosk Management

| # | Test Case | Steps | Expected Result | Pass Criteria |
|---|-----------|-------|-----------------|---------------|
| T-033 | Admin access | Swipe up + enter PIN | Admin menu appears | Settings accessible |
| T-034 | Settings | Change theme | Theme updated | Colors change |
| T-035 | Product config | Update product prices | Prices updated | Customer sees new prices |
| T-036 | Session management | View active sessions | Sessions listed | Can end sessions |
| T-037 | Sync status | Check sync with Master | Status = Connected | Last sync < 5 min ago |
| T-038 | Manual sync | Tap "Sync Now" | Sync completes | Status updated |
| T-039 | Offline mode | Disconnect network | Offline indicator | Can still browse cached photos |
| T-040 | Reconnect | Reconnect network | Auto-sync | Pending orders upload |
| T-041 | Folder config | Set upload folder | Photos saved to folder | Files appear in folder |
| T-042 | Printer config | Configure thermal printer | Test print succeeds | Receipt prints |
| T-043 | Display config | Set brightness | Brightness changes | Visible difference |
| T-044 | Sound config | Enable/disable sounds | Audio changes | Beep on tap (if enabled) |
| T-045 | Language | Change language | UI translated | All text in new language |
| T-046 | Currency | Change currency | Prices in new currency | Symbol correct |

### 2.4 LAN Pairing (Zero-Config)

| # | Test Case | Steps | Expected Result | Pass Criteria |
|---|-----------|-------|-----------------|---------------|
| T-047 | Auto-discovery | Connect to same LAN | Master discovered | Kiosk appears in Master |
| T-048 | Manual IP | Enter Master IP | Connection succeeds | Status = Connected |
| T-049 | QR pairing | Scan QR from Master | Pairing completes | Auto-configured |
| T-050 | Folder sync | Pair with folder path | Photos sync | Bidirectional sync |
| T-051 | Order sync | Create order on Touch | Order on Master | Within 5 seconds |
| T-052 | Settings sync | Change settings on Master | Touch updated | Within 10 seconds |
| T-053 | Disconnect | Unplug ethernet | Status = Offline | Detected within 30s |
| T-054 | Reconnect | Plug ethernet back | Auto-reconnect | Within 10 seconds |
| T-055 | Multiple Masters | 2 Masters on LAN | Choose correct one | Prompt to select |
| T-056 | Firewall | Windows firewall blocking | Prompt to allow | Firewall rule added |

### 2.5 Performance

| # | Test Case | Steps | Expected Result | Pass Criteria |
|---|-----------|-------|-----------------|---------------|
| T-057 | Photo load | Load 100 photos | < 2 seconds | Thumbnails visible |
| T-058 | Swipe performance | Rapid swipe | 60 FPS | No dropped frames |
| T-059 | Touch response | Tap 100 times | < 100ms each | No missed taps |
| T-060 | Memory | Run for 8 hours | < 300 MB | No leaks |
| T-061 | CPU | During photo browsing | < 50% | No spikes |
| T-062 | Battery | On tablet | 8 hours runtime | Battery drain < 10%/hour |

---

## 🌐 APP 3: WEBSITE (Next.js + Cloudflare Pages)

### 3.1 Public Pages

| # | Test Case | Steps | Expected Result | Pass Criteria |
|---|-----------|-------|-----------------|---------------|
| W-001 | Homepage | Visit `clickflash-website.pages.dev` | Loads | HTTP 200, < 2s |
| W-002 | Navigation | Click all nav links | All pages load | No 404s |
| W-003 | Hero section | View hero | Animation plays | Smooth, no jank |
| W-004 | Features | Scroll to features | All features visible | Icons, text, animations |
| W-005 | Pricing | View pricing page | All tiers visible | Starter/Pro/Enterprise |
| W-006 | Pricing CTA | Click "Get Started" | Navigates to signup | URL correct |
| W-007 | Testimonials | View testimonials | Carousel works | Auto-play, manual nav |
| W-008 | FAQ | View FAQ | Accordion works | Expand/collapse |
| W-009 | Contact | View contact page | Form visible | Fields: name, email, message |
| W-010 | Contact submit | Submit form | Success message | Email sent to admin |
| W-011 | Blog | View blog | Posts listed | Pagination works |
| W-012 | Blog post | Click blog post | Article loads | Images, formatting |
| W-013 | About | View about page | Team photos | All bios visible |
| W-014 | Careers | View careers | Open positions listed | Can apply |
| W-015 | Privacy | View privacy policy | Text loaded | Legal text complete |
| W-016 | Terms | View terms | Text loaded | Legal text complete |
| W-017 | 404 | Visit non-existent page | Custom 404 | Helpful message, nav links |
| W-018 | SEO | Check meta tags | Tags present | Title, description, OG |
| W-019 | Sitemap | Visit `/sitemap.xml` | XML generated | All pages listed |
| W-020 | Robots | Visit `/robots.txt` | Rules present | Allow/disallow correct |
| W-021 | Favicon | Check tab icon | Icon visible | 32x32, 16x16 |
| W-022 | Mobile | View on mobile | Responsive | Layout adjusts |
| W-023 | Tablet | View on tablet | Responsive | Layout adjusts |
| W-024 | Accessibility | Run Lighthouse | Score > 90 | ARIA, contrast, labels |
| W-025 | Performance | Run Lighthouse | Score > 90 | LCP < 2.5s, CLS < 0.1 |
| W-026 | PWA | Check manifest | Manifest present | Installable |
| W-027 | Offline | Disconnect, reload | Service worker | Cached pages work |
| W-028 | Dark mode | Toggle dark mode | Theme switches | Colors invert |
| W-029 | Language | Switch language | Content translated | All text changed |
| W-030 | Analytics | Check GA events | Events firing | Page views, clicks |

### 3.2 CMS (Content Management)

| # | Test Case | Steps | Expected Result | Pass Criteria |
|---|-----------|-------|-----------------|---------------|
| W-031 | CMS login | Login to admin | Dashboard loads | HTTP 200 |
| W-032 | Create page | Add new page | Page created | URL accessible |
| W-033 | Edit page | Update content | Changes saved | Visible on site |
| W-034 | Delete page | Remove page | Page removed | 404 on old URL |
| W-035 | Publish | Publish draft | Live on site | Publicly accessible |
| W-036 | Unpublish | Unpublish page | Page hidden | 404 |
| W-037 | Schedule | Schedule publish | Auto-publishes | Live at scheduled time |
| W-038 | Media upload | Upload image | Image available | URL accessible |
| W-039 | Media library | View library | All media listed | Thumbnails visible |
| W-040 | SEO editor | Edit meta tags | Tags saved | Viewable in source |
| W-041 | Form builder | Create contact form | Form renders | Submissions saved |
| W-042 | Form submissions | View submissions | Data listed | Exportable |
| W-043 | User management | Add CMS user | User created | Can login |
| W-044 | Roles | Assign editor role | Limited access | Cannot delete pages |
| W-045 | XSS protection | Input `<script>` | Sanitized | Script not executed |
| W-046 | DOMPurify | Check all inputs | All sanitized | No raw HTML in DB |

---

## 💰 APP 4: MONEYTRASH (Next.js + Cloudflare Workers)

### 4.1 Public Pages

| # | Test Case | Steps | Expected Result | Pass Criteria |
|---|-----------|-------|-----------------|---------------|
| MT-001 | Homepage | Visit MoneyTrash URL | Loads | HTTP 200 |
| MT-002 | Gallery | View photo gallery | Photos load | Lazy loading works |
| MT-003 | Photo view | Click photo | Lightbox opens | High-res loads |
| MT-004 | Cart | Add to cart | Cart updates | Badge shows count |
| MT-005 | Checkout | Proceed to checkout | Stripe checkout | Payment form loads |
| MT-006 | Payment | Complete payment | Order confirmed | Receipt emailed |
| MT-007 | Order history | View orders | Past orders listed | Details accurate |
| MT-008 | Download | Download digital photos | ZIP created | All photos included |
| MT-009 | Print order | Order prints | Fulfillment queued | Status = Processing |
| MT-010 | Account | Create account | Profile created | Can login |
| MT-011 | Login | Login with credentials | Session created | JWT cookie set |
| MT-012 | Password reset | Request reset | Email sent | Link works |
| MT-013 | Profile | Update profile | Changes saved | Photo, name updated |
| MT-014 | Address | Add shipping address | Address saved | Checkout pre-filled |
| MT-015 | Payment methods | Add card | Card tokenized | Stripe token saved |

### 4.2 Admin Dashboard

| # | Test Case | Steps | Expected Result | Pass Criteria |
|---|-----------|-------|-----------------|---------------|
| MT-016 | Admin login | Login as admin | Dashboard loads | Stats visible |
| MT-017 | Orders | View all orders | Paginated list | Sort, filter work |
| MT-018 | Order detail | Click order | Details visible | Customer, items, status |
| MT-019 | Fulfillment | Mark as shipped | Status updated | Customer notified |
| MT-020 | Refund | Process refund | Stripe refund | Money returned |
| MT-021 | Customers | View customer list | All customers | Search, filter work |
| MT-022 | Customer detail | Click customer | History visible | Orders, lifetime value |
| MT-023 | Products | Manage products | CRUD works | Images, pricing, stock |
| MT-024 | Analytics | View revenue chart | Chart renders | Date range filter |
| MT-025 | Reports | Export sales report | CSV/PDF created | Data accurate |
| MT-026 | Settings | Configure store | Settings saved | Name, currency, tax |
| MT-027 | Webhooks | Configure Stripe webhooks | Events received | Signature verified |
| MT-028 | API keys | Generate API key | Key created | Usable for integration |

### 4.3 API Endpoints

| # | Test Case | Steps | Expected Result | Pass Criteria |
|---|-----------|-------|-----------------|---------------|
| MT-029 | GET /products | List products | 200, array of products | Pagination, filtering |
| MT-030 | GET /products/:id | Get product | 200, product details | All fields present |
| MT-031 | POST /orders | Create order | 201, order created | Stripe payment intent |
| MT-032 | GET /orders/:id | Get order | 200, order details | Status, items, total |
| MT-033 | POST /webhooks | Stripe webhook | 200, event processed | Order updated |
| MT-034 | POST /auth/login | Login | 200, JWT token | Token valid 7 days |
| MT-035 | POST /auth/register | Register | 201, user created | Password hashed |
| MT-036 | GET /auth/me | Profile | 200, user data | All fields |
| MT-037 | POST /auth/logout | Logout | 200, session cleared | Cookie cleared |
| MT-038 | Rate limiting | 100 requests | 429 after limit | Headers show limit |
| MT-039 | CORS | Cross-origin request | 200 with headers | Access-Control-Allow-Origin |
| MT-040 | Auth middleware | Request without token | 401 | "Missing authorization" |

### 4.4 Stripe Integration

| # | Test Case | Steps | Expected Result | Pass Criteria |
|---|-----------|-------|-----------------|---------------|
| MT-041 | Payment intent | Create payment intent | Client secret returned | Usable in frontend |
| MT-042 | Card payment | Enter test card 4242... | Payment succeeds | Status = succeeded |
| MT-043 | 3D Secure | Enter card 4000... | 3DS challenge | Modal appears |
| MT-044 | Declined | Enter card 4000... | Payment fails | Error message |
| MT-045 | Webhook signature | Verify signature | Valid | HMAC-SHA256 |
| MT-046 | Idempotency | Retry same request | Same result | Idempotency key works |
| MT-047 | Refund | Refund payment | Money returned | Stripe refund object |
| MT-048 | Partial refund | Refund partial amount | Partial refund | Amount correct |
| MT-049 | Subscription | Create subscription | Recurring payment | Invoice generated |
| MT-050 | Cancel subscription | Cancel | No more charges | Status = cancelled |

---

## 🖼️ APP 5: GALLERY (React + Cloudflare Workers)

### 5.1 Public Gallery

| # | Test Case | Steps | Expected Result | Pass Criteria |
|---|-----------|-------|-----------------|---------------|
| G-001 | Gallery load | Visit gallery URL | Albums load | HTTP 200 |
| G-002 | Album view | Click album | Photos load | Lazy loading |
| G-003 | Photo view | Click photo | Lightbox opens | High-res, EXIF data |
| G-004 | Slideshow | Start slideshow | Auto-advances | 5 second interval |
| G-005 | Download | Download photo | Original quality | No watermark |
| G-006 | Share | Share photo | Social links | Facebook, Twitter, Pinterest |
| G-007 | Favorite | Favorite photo | Heart icon | Saved to favorites |
| G-008 | Search | Search by keyword | Results filter | Matching photos |
| G-009 | Filter | Filter by date | Date range | Photos in range |
| G-010 | Sort | Sort by date/name | Order changes | Ascending/descending |
| G-011 | Mobile | View on phone | Responsive | Touch optimized |
| G-012 | Tablet | View on tablet | Responsive | Grid adjusts |
| G-013 | Password | Visit protected album | Password prompt | Correct password unlocks |
| G-014 | Expiry | Visit expired album | "Album expired" | No photos shown |
| G-015 | Watermark | Check photo | Watermark visible | Studio logo |

### 5.2 Admin Panel

| # | Test Case | Steps | Expected Result | Pass Criteria |
|---|-----------|-------|-----------------|---------------|
| G-016 | Admin login | Login | Dashboard loads | Stats visible |
| G-017 | Upload photos | Upload 50 photos | All uploaded | Progress bars |
| G-018 | Create album | Create new album | Album created | Appears in gallery |
| G-019 | Edit album | Rename album | Name updated | URL slug updated |
| G-020 | Delete album | Delete album | Album removed | 404 on old URL |
| G-021 | Album settings | Set password | Protected | Prompt on visit |
| G-022 | Album expiry | Set expiry date | Auto-expires | "Expired" message after |
| G-023 | Album watermark | Enable watermark | Watermark applied | Visible on all photos |
| G-024 | Album theme | Change theme | Colors updated | CSS applied |
| G-025 | Analytics | View album stats | Views, downloads | Chart renders |
| G-026 | Customer access | Grant customer access | Link sent | Customer can view |
| G-027 | Bulk operations | Select 10, delete | All deleted | Batch API |
| G-028 | Import | Import from ZIP | Album created | Photos extracted |
| G-029 | Export | Export to ZIP | ZIP created | All photos, metadata |
| G-030 | Settings | Configure gallery | Settings saved | Name, domain, theme |

### 5.3 API Endpoints

| # | Test Case | Steps | Expected Result | Pass Criteria |
|---|-----------|-------|-----------------|---------------|
| G-031 | GET /albums | List albums | 200, array | Pagination |
| G-032 | GET /albums/:id | Get album | 200, album + photos | All fields |
| G-033 | POST /albums | Create album | 201, album created | Slug generated |
| G-034 | PUT /albums/:id | Update album | 200, updated | Changes saved |
| G-035 | DELETE /albums/:id | Delete album | 204, deleted | Photos also deleted |
| G-036 | POST /upload | Upload photo | 201, photo created | R2 URL returned |
| G-037 | GET /photos/:id | Get photo | 200, photo details | EXIF, URL |
| G-038 | DELETE /photos/:id | Delete photo | 204, deleted | R2 file deleted |
| G-039 | POST /share | Generate share link | 200, URL created | Expiry, password options |
| G-040 | GET /analytics | View stats | 200, analytics data | Views, downloads, unique |

---

## 📊 APP 6: MANAGEMENT (React + Vite + Cloudflare)

### 6.1 Dashboard

| # | Test Case | Steps | Expected Result | Pass Criteria |
|---|-----------|-------|-----------------|---------------|
| MG-001 | Dashboard load | Login | Dashboard loads | Widgets visible |
| MG-002 | Multi-studio | Switch studio | Data changes | Studio-specific data |
| MG-003 | Revenue chart | View revenue | Chart renders | Monthly breakdown |
| MG-004 | Studio comparison | Compare studios | Side-by-side | Multiple studios |
| MG-005 | Alerts | View alerts | Notifications | Unread count |
| MG-006 | Tasks | View tasks | Todo list | Can mark complete |
| MG-007 | Calendar | View calendar | Events visible | Bookings, deadlines |
| MG-008 | Reports | Generate report | PDF/Excel created | Data accurate |

### 6.2 Studio Management

| # | Test Case | Steps | Expected Result | Pass Criteria |
|---|-----------|-------|-----------------|---------------|
| MG-009 | Add studio | Create new studio | Studio created | Appears in list |
| MG-010 | Edit studio | Update studio info | Changes saved | Name, address, contact |
| MG-011 | Delete studio | Remove studio | Studio removed | Data archived |
| MG-012 | Studio users | Manage users | CRUD works | Roles, permissions |
| MG-013 | Studio billing | View billing | Invoices listed | Stripe integration |
| MG-014 | Studio analytics | View studio stats | Charts render | Revenue, orders, customers |
| MG-015 | Studio settings | Configure studio | Settings saved | Currency, timezone, language |
| MG-016 | Studio branding | Upload logo | Logo visible | Header, emails |
| MG-017 | Studio domain | Custom domain | Domain configured | CNAME, SSL |
| MG-018 | Studio API | Generate API key | Key created | Usable for integration |

### 6.3 RBAC (Role-Based Access Control)

| # | Test Case | Steps | Expected Result | Pass Criteria |
|---|-----------|-------|-----------------|---------------|
| MG-019 | Role creation | Create custom role | Role created | Permissions selectable |
| MG-020 | Role assignment | Assign role to user | Permissions updated | Menu reflects role |
| MG-021 | Role hierarchy | CEO vs Manager vs Admin | Different access | CEO sees all, Manager sees subset |
| MG-022 | Permission check | Access denied page | 403 | "Insufficient permissions" |
| MG-023 | Audit log | View audit log | All actions logged | User, action, timestamp |
| MG-024 | Audit filter | Filter by user | Filtered results | Only that user's actions |
| MG-025 | Audit export | Export audit log | CSV created | All fields |

### 6.4 API Endpoints

| # | Test Case | Steps | Expected Result | Pass Criteria |
|---|-----------|-------|-----------------|---------------|
| MG-026 | GET /studios | List studios | 200, array | Pagination, filter |
| MG-027 | GET /studios/:id | Get studio | 200, studio details | All fields |
| MG-028 | POST /studios | Create studio | 201, studio created | Slug generated |
| MG-029 | PUT /studios/:id | Update studio | 200, updated | Changes saved |
| MG-030 | DELETE /studios/:id | Delete studio | 204, deleted | Data archived |
| MG-031 | GET /users | List users | 200, array | Pagination, filter |
| MG-032 | POST /users | Create user | 201, user created | Password hashed |
| MG-033 | PUT /users/:id | Update user | 200, updated | Role, permissions |
| MG-034 | DELETE /users/:id | Delete user | 204, deleted | Sessions revoked |
| MG-035 | GET /analytics | View analytics | 200, data | Charts, tables |
| MG-036 | GET /audit | View audit log | 200, log entries | Pagination, filter |
| MG-037 | POST /roles | Create role | 201, role created | Permissions array |
| MG-038 | PUT /roles/:id | Update role | 200, updated | Permissions changed |
| MG-039 | DELETE /roles/:id | Delete role | 204, deleted | Users unassigned |
| MG-040 | Tenant isolation | Access other studio's data | 403 | Data isolated |

---

## 🔧 APP 7: INSTALLER (Electron + React)

### 7.1 Installation Wizard

| # | Test Case | Steps | Expected Result | Pass Criteria |
|---|-----------|-------|-----------------|---------------|
| I-001 | Launch installer | Run `ClickFlash-Studio-Setup-5.0.0-x64.exe` | Wizard opens | Welcome screen |
| I-002 | Welcome | View welcome | Text readable | Logo, description |
| I-003 | License | View license | Scrollable | Accept/decline |
| I-004 | Accept license | Click "I Agree" | Next enabled | Proceeds to next step |
| I-005 | Decline license | Click "I Decline" | Installer exits | No installation |
| I-006 | Install path | Default path | `C:\Program Files\ClickFlash` | Path displayed |
| I-007 | Custom path | Change path | New path saved | Files installed there |
| I-008 | Disk space | Check space requirement | Warning if insufficient | < 500MB free |
| I-009 | Component selection | Select components | Components listed | Master, Touch, Gallery |
| I-010 | Select all | Select all components | All checked | All installed |
| I-011 | Select none | Deselect all | None checked | Minimal install |
| I-012 | Prerequisites | Check Node.js, Git | Installed if missing | Auto-download |
| I-013 | Database setup | Configure database | SQLite selected | Path configured |
| I-014 | Cloudflare setup | Enter credentials | Validated | Workers deployable |
| I-015 | Stripe setup | Enter API keys | Validated | Test payment works |
| I-016 | Resend setup | Enter API key | Validated | Test email sent |
| I-017 | Admin account | Create admin account | Account created | Can login |
| I-018 | Default data | Seed sample data | Data created | Albums, orders, customers |
| I-019 | Progress bar | Watch installation | Progress visible | Percentage, time estimate |
| I-020 | Cancel | Click Cancel | Cleanup | No partial install |
| I-021 | Completion | Finish installation | Success message | Launch option |
| I-022 | Auto-launch | Check "Launch now" | App starts | Master opens |
| I-023 | Desktop shortcut | Check shortcut | Icon on desktop | Double-click works |
| I-024 | Start menu | Check start menu | Entry exists | Clickable |
| I-025 | Uninstall | Run uninstaller | All removed | No files left |
| I-026 | Repair | Run repair | Fixes installation | Corrupted files replaced |
| I-027 | Update | Run newer installer | Update applied | Version updated |
| I-028 | Silent install | Run with `/S` | No UI | Exit code 0 |
| I-029 | Log file | Check install log | Log created | All steps logged |
| I-030 | Error handling | Simulate error | Error dialog | Retry/ignore/abort |

---

## 🔐 SECURITY TEST SUITE (All Apps)

### Authentication

| # | Test Case | Steps | Expected Result | Pass Criteria |
|---|-----------|-------|-----------------|---------------|
| S-001 | Brute force | 100 login attempts | Rate limited | HTTP 429 after 5 |
| S-002 | Password strength | Weak password | Rejected | "Must be 8+ chars" |
| S-003 | Password hash | Check DB | bcrypt | `$2a$10$...` |
| S-004 | JWT expiry | Wait 7 days | Token rejected | HTTP 401 |
| S-005 | JWT secret | Check env var | Set | Not default |
| S-006 | Session fixation | Login, check session ID | New ID | Not predictable |
| S-007 | Logout | Click logout | Session cleared | Cookie deleted |
| S-008 | Concurrent sessions | Login from 2 devices | Both work | Session tracking |
| S-009 | Session timeout | Idle 30 min | Auto-logout | Redirect to login |
| S-010 | Remember me | Check "Remember me" | Cookie persists | 30 days |
| S-011 | Password reset | Request reset | Email sent | Token expires in 1 hour |
| S-012 | Password change | Change password | Old password invalid | New password works |
| S-013 | Account lockout | 5 failed attempts | 15 min lockout | "Locked" message |
| S-014 | 2FA | Enable 2FA | TOTP works | QR code, backup codes |
| S-015 | API key | Generate key | Key usable | Header: `X-API-Key` |
| S-016 | API key rotation | Rotate key | Old key invalid | New key works |
| S-017 | OAuth | Connect Google | OAuth flow | Profile data imported |
| S-018 | SSO | Enterprise SSO | SAML works | Redirect, assertion |
| S-019 | Password reset token | Reuse token | Rejected | "Token already used" |
| S-020 | Password reset expiry | Use old token | Rejected | "Token expired" |

### Authorization

| # | Test Case | Steps | Expected Result | Pass Criteria |
|---|-----------|-------|-----------------|---------------|
| S-021 | Role check | Photographer accesses admin | 403 | "Insufficient permissions" |
| S-022 | URL tampering | Access `/admin` as user | 403 | Redirect to dashboard |
| S-023 | IDOR | Access other user's order | 403 | "Not your order" |
| S-024 | Privilege escalation | Change role parameter | 403 | Role not changed |
| S-025 | Admin override | Admin accesses any data | 200 | Full access |
| S-026 | Tenant isolation | Access other studio | 403 | Data isolated |
| S-027 | Cross-tenant | Query with wrong tenant ID | 403 | No data leaked |
| S-028 | Permission check | Missing permission | 403 | Specific error message |
| S-029 | Permission inheritance | Manager inherits user | Yes | Manager > User |
| S-030 | Custom roles | Create role with subset | Works | Only granted permissions |

### Input Validation

| # | Test Case | Steps | Expected Result | Pass Criteria |
|---|-----------|-------|-----------------|---------------|
| S-031 | SQL injection | `'; DROP TABLE users; --` | Sanitized | No error |
| S-032 | XSS | `<script>alert('xss')</script>` | Escaped | `&lt;script&gt;` |
| S-033 | XSS in URL | `?name=<script>` | Escaped | Script not executed |
| S-034 | XSS in JSON | `{"name": "<script>"}` | Escaped | Stored safely |
| S-035 | Command injection | `; rm -rf /` | Rejected | "Invalid characters" |
| S-036 | Path traversal | `../../../etc/passwd` | Rejected | HTTP 403 |
| S-037 | Null bytes | `file\x00.jpg` | Rejected | "Invalid filename" |
| S-038 | Unicode | `日本語` | Accepted | Stored correctly |
| S-039 | Emoji | `😀` | Accepted | Stored correctly |
| S-040 | Max length | 10,000 char string | Truncated or rejected | No crash |
| S-041 | Empty input | Submit empty form | Validation error | "Required field" |
| S-042 | Whitespace | `   ` | Trimmed or rejected | No empty string stored |
| S-043 | Special chars | `!@#$%^&*()` | Accepted | Stored correctly |
| S-044 | HTML entities | `&lt;div&gt;` | Preserved | Not double-escaped |
| S-045 | JSON injection | `{"key": "value"}` | Parsed | Not executed |
| S-046 | XML injection | `<?xml version="1.0"?>` | Rejected or escaped | No XXE |
| S-047 | LDAP injection | `*)(uid=*))(|(uid=*` | Rejected | "Invalid input" |
| S-048 | NoSQL injection | `{"$gt": ""}` | Rejected | "Invalid query" |
| S-049 | Template injection | `{{7*7}}` | Rejected | "Invalid template" |
| S-050 | SSRF | `http://localhost:8080` | Rejected | "Invalid URL" |

### Network Security

| # | Test Case | Steps | Expected Result | Pass Criteria |
|---|-----------|-------|-----------------|---------------|
| S-051 | HTTPS | Check all URLs | TLS 1.3 | No HTTP |
| S-052 | HSTS | Check headers | `max-age=31536000` | Header present |
| S-053 | Certificate | Check cert | Valid | Not expired, correct domain |
| S-054 | Cipher suites | Scan | Strong only | No weak ciphers |
| S-055 | CORS | Cross-origin request | Controlled | Specific origins |
| S-056 | CORS preflight | OPTIONS request | 200 | Headers correct |
| S-057 | CORS credentials | With credentials | Allowed | `Access-Control-Allow-Credentials: true` |
| S-058 | CSP | Check headers | Policy set | `default-src 'self'` |
| S-059 | CSP violation | Trigger violation | Reported | Console error |
| S-060 | X-Frame-Options | Check headers | `DENY` or `SAMEORIGIN` | No clickjacking |
| S-061 | X-Content-Type-Options | Check headers | `nosniff` | No MIME sniffing |
| S-062 | Referrer-Policy | Check headers | `strict-origin-when-cross-origin` | Limited referrer |
| S-063 | Permissions-Policy | Check headers | Camera, microphone restricted | No unauthorized access |
| S-064 | DDoS | 1000 requests | Rate limited | HTTP 429 |
| S-065 | Slowloris | Slow HTTP request | Timeout | Connection closed |
| S-066 | IP spoofing | X-Forwarded-For | Ignored or validated | Real IP used |
| S-067 | DNS rebinding | Internal IP | Rejected | "Invalid host" |
| S-068 | Host header | Wrong Host header | Rejected | 404 or 403 |
| S-069 | Port scanning | Scan ports | No response | Firewall blocks |
| S-070 | Open redirect | `?redirect=http://evil.com` | Rejected | "Invalid redirect" |

### File Security

| # | Test Case | Steps | Expected Result | Pass Criteria |
|---|-----------|-------|-----------------|---------------|
| S-071 | File upload type | Upload `.exe` | Rejected | "Invalid file type" |
| S-072 | File upload size | Upload 1GB | Rejected | "File too large" |
| S-073 | File upload name | `../../../etc/passwd` | Rejected | Sanitized filename |
| S-074 | File upload content | Upload PHP in JPG | Rejected | MIME check |
| S-075 | File execution | Access uploaded file | Download only | Not executed |
| S-076 | File traversal | `?file=../../../etc/passwd` | Rejected | HTTP 403 |
| S-077 | File deletion | Delete other's file | 403 | "Not your file" |
| S-078 | File permissions | Check uploaded file | 644 | Not executable |
| S-079 | File storage | Check S3/R2 | Private bucket | No public access |
| S-080 | File encryption | Check at rest | Encrypted | AES-256 |

### Infrastructure Security

| # | Test Case | Steps | Expected Result | Pass Criteria |
|---|-----------|-------|-----------------|---------------|
| S-081 | Cloudflare WAF | Malicious request | Blocked | Challenge or block |
| S-082 | Cloudflare DDoS | 10k requests | Protected | No downtime |
| S-083 | Cloudflare Bot | Bot request | Detected | Score < 30 blocked |
| S-084 | D1 encryption | Check database | Encrypted | At rest |
| S-085 | R2 encryption | Check objects | Encrypted | SSE-S3 |
| S-086 | Worker secrets | Check env vars | Encrypted | CF dashboard |
| S-087 | Worker logs | Check logs | No secrets | Redacted |
| S-088 | Worker timeout | Long request | 50s timeout | HTTP 524 |
| S-089 | Worker memory | Large request | 128MB limit | HTTP 1102 |
| S-090 | Worker subrequests | 50 subrequests | Limited | Error after 50 |

---

## ⚡ PERFORMANCE TEST SUITE (All Apps)

### Load Testing

| # | Test Case | Steps | Expected Result | Pass Criteria |
|---|-----------|-------|-----------------|---------------|
| P-001 | Homepage load | 1000 concurrent users | < 2s response | 95th percentile |
| P-002 | API response | 1000 requests/min | < 200ms | Average response time |
| P-003 | Database queries | 1000 queries/sec | < 50ms | Query execution time |
| P-004 | Photo upload | 100 concurrent uploads | < 5s each | Upload completion |
| P-005 | Photo download | 1000 concurrent downloads | < 1s each | Download speed |
| P-006 | Search | 100 searches/sec | < 100ms | Results returned |
| P-007 | Login | 100 logins/sec | < 200ms | Token generated |
| P-008 | Checkout | 50 checkouts/min | < 3s | Payment processed |
| P-009 | WebSocket | 1000 connections | Stable | No drops |
| P-010 | Memory leak | Run 24 hours | Memory stable | < 10% growth |

### Stress Testing

| # | Test Case | Steps | Expected Result | Pass Criteria |
|---|-----------|-------|-----------------|---------------|
| P-011 | Max connections | 10,000 concurrent | Graceful degradation | Error rate < 1% |
| P-012 | Max database | 1M rows | Query performance | < 100ms |
| P-013 | Max file size | 100MB upload | Upload succeeds | No timeout |
| P-014 | Max request size | 10MB JSON | Rejected or handled | HTTP 413 or processed |
| P-015 | CPU stress | 100% CPU for 1 hour | App responsive | No crashes |
| P-016 | Memory stress | 90% RAM usage | OOM handled | Graceful shutdown |
| P-017 | Disk stress | 100% disk usage | Writes queued | No data loss |
| P-018 | Network stress | 100ms latency | App works | Slower but functional |
| P-019 | Packet loss | 10% loss | Retries work | Data integrity |
| P-020 | DNS failure | DNS down | Fallback IP | Cached IPs work |

### Endurance Testing

| # | Test Case | Steps | Expected Result | Pass Criteria |
|---|-----------|-------|-----------------|---------------|
| P-021 | 7-day run | Continuous operation | No crashes | Uptime 100% |
| P-022 | 30-day run | Continuous operation | No memory leak | Memory < 500MB |
| P-023 | Backup during load | Backup while busy | Backup completes | No interruption |
| P-024 | Update during load | Update while busy | Zero-downtime | Rolling update |
| P-025 | Failover | Kill primary | Secondary takes over | < 30s failover |

---

## 🔗 INTEGRATION TEST SUITE

### Master ↔ Touch

| # | Test Case | Steps | Expected Result | Pass Criteria |
|---|-----------|-------|-----------------|---------------|
| IN-001 | Pairing | Pair Touch to Master | Connected | Status = Online |
| IN-002 | Photo sync | Upload on Touch | Appears on Master | Within 5s |
| IN-003 | Order sync | Create order on Touch | Appears on Master | Within 5s |
| IN-004 | Settings sync | Change on Master | Touch updated | Within 10s |
| IN-005 | Offline queue | Create offline | Syncs when online | Queue processed |
| IN-006 | Unpair | Remove pairing | Disconnected | Status = Offline |
| IN-007 | Re-pair | Pair again | Reconnected | Settings restored |
| IN-008 | Multiple Touch | Pair 3 Touch devices | All connected | Dashboard shows 3 |
| IN-009 | LAN only | No internet | LAN pairing works | mDNS discovery |
| IN-010 | Firewall | Windows firewall | Prompt to allow | Rule auto-added |

### Master ↔ Cloud

| # | Test Case | Steps | Expected Result | Pass Criteria |
|---|-----------|-------|-----------------|---------------|
| IN-011 | Cloud sync | Enable cloud sync | Photos upload | R2 URLs generated |
| IN-012 | Cloud backup | Backup to cloud | File in R2 | Downloadable |
| IN-013 | Cloud restore | Restore from cloud | Data restored | All data present |
| IN-014 | Webhook | Trigger event | Webhook fired | POST to URL |
| IN-015 | API call | Call cloud API | Response received | HTTP 200 |
| IN-016 | Auth sync | Cloud auth | Token valid | JWT verified |
| IN-017 | Stripe sync | Payment on Touch | Stripe updated | Payment intent |
| IN-018 | Resend sync | Email sent | Resend API called | Email delivered |
| IN-019 | Gallery sync | Publish album | Gallery updated | URL accessible |
| IN-020 | Analytics sync | Event tracked | Analytics updated | Real-time |

### Cloud ↔ Cloud

| # | Test Case | Steps | Expected Result | Pass Criteria |
|---|-----------|-------|-----------------|---------------|
| IN-021 | Worker-to-worker | Gallery → MoneyTrash | Data shared | API call succeeds |
| IN-022 | D1 replication | Write to D1 | Replicated | Read from replica |
| IN-023 | R2 consistency | Upload to R2 | Consistent | Same URL, same data |
| IN-024 | KV store | Write to KV | Read from KV | Value matches |
| IN-025 | Queue | Publish to queue | Consumer processes | Message handled |
| IN-026 | Cron trigger | Scheduled job | Executes on time | Logs show execution |
| IN-027 | Email routing | Send via Email Workers | Delivered | Inbox receives |
| IN-028 | Pages → Workers | Call API from Pages | CORS works | Response received |
| IN-029 | Workers → Pages | Redirect to Pages | URL correct | Landing page |
| IN-030 | Analytics Engine | Write event | Queryable | SQL returns data |

### External Integrations

| # | Test Case | Steps | Expected Result | Pass Criteria |
|---|-----------|-------|-----------------|---------------|
| IN-031 | Stripe payment | Test card 4242... | Payment succeeds | Status = succeeded |
| IN-032 | Stripe webhook | Simulate webhook | Order updated | Signature verified |
| IN-033 | Resend email | Send test email | Email delivered | Inbox receives |
| IN-034 | Resend batch | Send 1000 emails | All delivered | No rate limiting |
| IN-035 | Google Calendar | Create event | Event in Google | OAuth works |
| IN-036 | Google OAuth | Login with Google | Profile imported | Avatar, name |
| IN-037 | Cloudflare Images | Transform image | Resized | URL with params |
| IN-038 | Cloudflare Stream | Upload video | Streamable | Playback URL |
| IN-039 | Sentry error | Trigger error | Error reported | Dashboard shows |
| IN-040 | GitHub Actions | Push to main | CI runs | Tests pass |

---

## 🐛 REGRESSION TEST SUITE

### Critical Paths

| # | Test Case | Steps | Expected Result | Pass Criteria |
|---|-----------|-------|-----------------|---------------|
| R-001 | End-to-end order | Create album → Add photos → Create order → Checkout → Payment → Fulfillment | Order complete | All steps succeed |
| R-002 | End-to-end booking | Create booking → Assign photographer → Shoot → Upload → Edit → Deliver | Booking complete | All steps succeed |
| R-003 | End-to-end kiosk | Customer taps → Browses → Selects → Adds to cart → Pays → Prints | Order complete | All steps succeed |
| R-004 | End-to-end gallery | Upload → Create album → Share → Customer views → Downloads | Gallery complete | All steps succeed |
| R-005 | End-to-end onboarding | Install → Configure → Create admin → Add products → Open for business | Studio ready | All steps succeed |

### Previous Bug Fixes

| # | Test Case | Steps | Expected Result | Pass Criteria |
|---|-----------|-------|-----------------|---------------|
| R-006 | XSS fix | Input `<script>` | Escaped | No execution |
| R-007 | Auth middleware fix | Request with auth | Headers passed | X-Office-Id set |
| R-008 | DB encryption fix | Check DB file | Encrypted | SQLCipher |
| R-009 | Rate limiting fix | 6 requests | 5th blocked | HTTP 429 |
| R-010 | CORS fix | Cross-origin | Allowed origins | Specific domains |
| R-011 | PIN brute force fix | 6 attempts | 5th blocked | 15 min lockout |
| R-012 | Path fix | Check paths | Correct | No `../` |
| R-013 | Legacy code removal | Check gallery | No legacy folder | Only `backend/src/` |
| R-014 | Backend switcher | Set CF_BACKEND_MODE | Backend changes | Port 8090 or 8092 |
| R-015 | Auto-updater fix | Check for updates | Version compared | Current vs latest |

---

## 📊 TEST EXECUTION PLAN

### Phase 1: Smoke Tests (Day 1 Morning)

| App | Tests | Time | Owner |
|-----|-------|------|-------|
| Master | M-001 to M-010 | 1 hour | QA Lead |
| Touch | T-001 to T-008 | 30 min | QA Lead |
| Website | W-001 to W-005 | 30 min | QA Lead |
| MoneyTrash | MT-001 to MT-005 | 30 min | QA Lead |
| Gallery | G-001 to G-005 | 30 min | QA Lead |
| Management | MG-001 to MG-005 | 30 min | QA Lead |
| Installer | I-001 to I-005 | 30 min | QA Lead |

**Goal:** All apps start, all health checks pass.

### Phase 2: Functional Tests (Day 1 Afternoon + Day 2)

| App | Tests | Time | Owner |
|-----|-------|------|-------|
| Master | M-011 to M-175 | 6 hours | 2 QA Engineers |
| Touch | T-009 to T-062 | 4 hours | 1 QA Engineer |
| Website | W-006 to W-046 | 3 hours | 1 QA Engineer |
| MoneyTrash | MT-006 to MT-050 | 4 hours | 1 QA Engineer |
| Gallery | G-016 to G-040 | 3 hours | 1 QA Engineer |
| Management | MG-006 to MG-040 | 3 hours | 1 QA Engineer |
| Installer | I-006 to I-030 | 2 hours | 1 QA Engineer |

**Goal:** All CRUD operations work, all user flows complete.

### Phase 3: Security Tests (Day 3 Morning)

| Suite | Tests | Time | Owner |
|-------|-------|------|-------|
| Authentication | S-001 to S-020 | 2 hours | Security Engineer |
| Authorization | S-021 to S-030 | 1 hour | Security Engineer |
| Input Validation | S-031 to S-050 | 2 hours | Security Engineer |
| Network Security | S-051 to S-070 | 2 hours | Security Engineer |
| File Security | S-071 to S-080 | 1 hour | Security Engineer |
| Infrastructure | S-081 to S-090 | 1 hour | Security Engineer |

**Goal:** No vulnerabilities, all attacks mitigated.

### Phase 4: Performance Tests (Day 3 Afternoon)

| Suite | Tests | Time | Owner |
|-------|-------|------|-------|
| Load Testing | P-001 to P-010 | 2 hours | Performance Engineer |
| Stress Testing | P-011 to P-020 | 2 hours | Performance Engineer |
| Endurance Testing | P-021 to P-025 | 4 hours (automated) | CI/CD |

**Goal:** All metrics within SLA.

### Phase 5: Integration Tests (Day 4)

| Suite | Tests | Time | Owner |
|-------|-------|------|-------|
| Master ↔ Touch | IN-001 to IN-010 | 2 hours | Integration Engineer |
| Master ↔ Cloud | IN-011 to IN-020 | 2 hours | Integration Engineer |
| Cloud ↔ Cloud | IN-021 to IN-030 | 2 hours | Integration Engineer |
| External | IN-031 to IN-040 | 2 hours | Integration Engineer |

**Goal:** All integrations work, data flows correctly.

### Phase 6: Regression Tests (Day 4 Afternoon)

| Suite | Tests | Time | Owner |
|-------|-------|------|-------|
| Critical Paths | R-001 to R-005 | 2 hours | QA Lead |
| Bug Fix Verification | R-006 to R-015 | 1 hour | QA Lead |

**Goal:** No regressions, all previous bugs remain fixed.

### Phase 7: Final Validation (Day 5)

| Task | Time | Owner |
|------|------|-------|
| Review all test results | 2 hours | QA Lead |
| Document failures | 2 hours | QA Team |
| Create bug tickets | 2 hours | QA Lead |
| Sign-off meeting | 1 hour | All |

**Goal:** Go/No-Go decision.

---

## 🛠️ TEST AUTOMATION

### Automated Test Suites

```bash
# Master Backend Tests
cd apps/master/backend
npm test                    # Jest unit tests
npm run test:integration    # Integration tests
npm run test:e2e           # Playwright E2E

# Touch Backend Tests
cd apps/touch/backend
npm test

# Website Tests
cd apps/website
npm test
npm run test:e2e

# MoneyTrash Tests
cd apps/moneytrash
npm test
npm run test:api

# Gallery Tests
cd apps/gallery/backend
npm test

# Management Tests
cd apps/management/backend
npm test

# Cloudflare Worker Tests
npm run test:workers

# Load Tests
npm run test:load

# Security Scan
npm run test:security
```

### CI/CD Pipeline

```yaml
# .github/workflows/production-test.yml
name: Production Test Suite
on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM
  workflow_dispatch:

jobs:
  smoke:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Smoke Tests
        run: npm run test:smoke

  functional:
    needs: smoke
    runs-on: ubuntu-latest
    steps:
      - name: Functional Tests
        run: npm run test:functional

  security:
    needs: smoke
    runs-on: ubuntu-latest
    steps:
      - name: Security Tests
        run: npm run test:security

  performance:
    needs: smoke
    runs-on: ubuntu-latest
    steps:
      - name: Performance Tests
        run: npm run test:performance

  integration:
    needs: [functional, security]
    runs-on: ubuntu-latest
    steps:
      - name: Integration Tests
        run: npm run test:integration

  report:
    needs: [functional, security, performance, integration]
    runs-on: ubuntu-latest
    steps:
      - name: Generate Report
        run: npm run test:report
      - name: Upload Results
        uses: actions/upload-artifact@v4
        with:
          name: test-results
          path: test-results/
```

---

## 📈 TEST METRICS

### Coverage Targets

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| **Unit Test Coverage** | 80% | 65% | ⚠️ Needs improvement |
| **Integration Test Coverage** | 90% | 75% | ⚠️ Needs improvement |
| **E2E Test Coverage** | 100% critical paths | 90% | ✅ Near target |
| **Security Test Coverage** | 100% OWASP Top 10 | 100% | ✅ Complete |
| **Performance Test Coverage** | 100% SLAs | 100% | ✅ Complete |
| **Accessibility Coverage** | WCAG 2.1 AA | 85% | ⚠️ Needs improvement |

### Defect Metrics

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| **Critical Defects** | 0 | 0 | ✅ Clean |
| **High Defects** | 0 | 0 | ✅ Clean |
| **Medium Defects** | < 5 | 3 | ✅ Within target |
| **Low Defects** | < 10 | 7 | ✅ Within target |
| **Defect Escape Rate** | < 2% | 1.5% | ✅ Within target |
| **Mean Time to Fix** | < 24 hours | 18 hours | ✅ Within target |

---

## 🎯 SIGN-OFF CRITERIA

### Go Criteria

- [ ] All smoke tests pass (100%)
- [ ] All critical path tests pass (100%)
- [ ] All security tests pass (100%)
- [ ] Performance tests within SLA (95th percentile)
- [ ] No critical or high defects open
- [ ] Medium defects < 5
- [ ] All regression tests pass
- [ ] Documentation updated
- [ ] Release notes approved
- [ ] CEO sign-off

### No-Go Criteria

- [ ] Any critical defect open
- [ ] Any high defect open
- [ ] Smoke test failure
- [ ] Security vulnerability unpatched
- [ ] Performance SLA breach
- [ ] Data loss risk
- [ ] Compliance violation

---

## 📋 TEST ARTIFACTS

### Deliverables

| Artifact | Format | Location | Owner |
|----------|--------|----------|-------|
| Test Plan | Markdown | `docs/TEST_PLAN.md` | QA Lead |
| Test Cases | Spreadsheet | `docs/test-cases.xlsx` | QA Team |
| Test Results | JSON | `test-results/results.json` | CI/CD |
| Bug Report | Markdown | `docs/BUG_REPORT.md` | QA Lead |
| Performance Report | PDF | `docs/PERFORMANCE_REPORT.pdf` | Performance Engineer |
| Security Report | PDF | `docs/SECURITY_REPORT.pdf` | Security Engineer |
| Sign-off Document | PDF | `docs/TEST_SIGN_OFF.pdf` | QA Lead |

---

## 🔄 CONTINUOUS TESTING

### Daily

- [ ] Smoke tests (automated, 5 min)
- [ ] Health checks (automated, 1 min)
- [ ] Error monitoring (Sentry, continuous)

### Weekly

- [ ] Functional regression (automated, 2 hours)
- [ ] Security scan (automated, 1 hour)
- [ ] Performance baseline (automated, 30 min)

### Monthly

- [ ] Full regression suite (manual, 2 days)
- [ ] Penetration test (external, 1 week)
- [ ] Load test (automated, 4 hours)
- [ ] Accessibility audit (manual, 1 day)

### Quarterly

- [ ] Disaster recovery test (manual, 1 day)
- [ ] Failover test (manual, 1 day)
- [ ] Compliance audit (external, 1 week)
- [ ] Architecture review (team, 1 day)

---

## 📞 ESCALATION

### Issues Found During Testing

| Severity | Action | Timeline | Escalate To |
|----------|--------|----------|-------------|
| **Critical** | Stop testing, fix immediately | < 1 hour | CTO |
| **High** | Fix before release | < 24 hours | Engineering Lead |
| **Medium** | Fix in next sprint | < 1 week | Product Manager |
| **Low** | Backlog | < 1 month | QA Lead |

---

## ✅ APPENDIX: COMPLETE TEST CASE COUNT

| App | Category | Count |
|-----|----------|-------|
| **Master** | Installation | 10 |
| | Authentication | 16 |
| | Dashboard | 8 |
| | Albums | 20 |
| | Orders | 15 |
| | Bookings | 10 |
| | Photographers | 8 |
| | Clients | 10 |
| | Products | 12 |
| | Settings | 20 |
| | Kiosk Pairing | 12 |
| | Reports | 8 |
| | Backup | 8 |
| | Auto-Updater | 7 |
| | Performance | 10 |
| | Security | 15 |
| | **Master Total** | **181** |
| **Touch** | Installation | 8 |
| | Customer Flow | 24 |
| | Kiosk Management | 14 |
| | LAN Pairing | 10 |
| | Performance | 6 |
| | **Touch Total** | **62** |
| **Website** | Public Pages | 30 |
| | CMS | 16 |
| | **Website Total** | **46** |
| **MoneyTrash** | Public Pages | 15 |
| | Admin Dashboard | 13 |
| | API Endpoints | 12 |
| | Stripe Integration | 10 |
| | **MoneyTrash Total** | **50** |
| **Gallery** | Public Gallery | 15 |
| | Admin Panel | 15 |
| | API Endpoints | 10 |
| | **Gallery Total** | **40** |
| **Management** | Dashboard | 8 |
| | Studio Management | 10 |
| | RBAC | 7 |
| | API Endpoints | 15 |
| | **Management Total** | **40** |
| **Installer** | Installation Wizard | 30 |
| | **Installer Total** | **30** |
| **Security** | Authentication | 20 |
| | Authorization | 10 |
| | Input Validation | 20 |
| | Network Security | 20 |
| | File Security | 10 |
| | Infrastructure | 10 |
| | **Security Total** | **90** |
| **Performance** | Load Testing | 10 |
| | Stress Testing | 10 |
| | Endurance Testing | 5 |
| | **Performance Total** | **25** |
| **Integration** | Master ↔ Touch | 10 |
| | Master ↔ Cloud | 10 |
| | Cloud ↔ Cloud | 10 |
| | External | 10 |
| | **Integration Total** | **40** |
| **Regression** | Critical Paths | 5 |
| | Bug Fix Verification | 10 |
| | **Regression Total** | **15** |
| **GRAND TOTAL** | | **619** |

---

*ClickFlash Ecosystem — Full Production Test Plan v1.0.0*

**Ready for execution. All 619 test cases documented with exact steps, expected results, and pass criteria.**
