# 05 — Documentation Suite & User Manuals

> **Goal:** Every person who touches ClickFlash (studio manager, photographer, kiosk customer, IT admin, Cloud admin, developer) has **a single document that makes them successful in their first 10 minutes** with the product.

---

## 1. The 8 documents we will ship this quarter

| # | Audience | Doc | Length | Format | Owner |
|---|---|---|---|---|---|
| 1 | Studio Manager (non-technical) | `MANUAL_STUDIO_MANAGER.md` | 40 pages | MD + PDF + 5-min video | Tech writer (0.5 FTE) |
| 2 | Photographer (tech-curious) | `MANUAL_PHOTOGRAPHER.md` | 20 pages | MD + PDF + pocket card | Tech writer |
| 3 | Kiosk Customer | `KIOSK_QUICKSTART.md` | 1 page A4 | MD + PDF (large print) + pictograms | Designer + writer |
| 4 | On-site IT Admin | `MANUAL_INSTALL_ADMIN.md` | 60 pages | MD + PowerShell scripts | Electron eng |
| 5 | Cloud Admin (HQ) | `OPS_RUNBOOK.md` | 80 pages | MD + runnable commands | CF eng |
| 6 | Developer (existing) | `DEV_SETUP.md` + `API.md` (exists) + `ARCHITECTURE.md` (exists) | 100+ pages | MD | Electron eng |
| 7 | Security Auditor | `SECURITY.md` (exists, refresh) | 30 pages | MD | Security eng (fractional) |
| 8 | End-user legal | `EULA.md` + `PRIVACY.md` + `DPA.md` | 15 pages | MD → PDF | Legal counsel |

---

## 2. Doc 1 — Studio Manager Manual (the most important)

> *Audience: A 45-year-old hotel manager who hates computers. She runs the photography desk. She needs to know: how do I turn this thing on, what do I do when something goes wrong, and who do I call.*

### Outline
```
1. Welcome
   - What is ClickFlash?
   - What's a "Master"? What's a "Touch"?
   - Glossary (1 page, no jargon)
2. The first 5 minutes
   - Turning on the Master
   - Turning on the Touch
   - Logging in (default credentials + how to change them)
3. Daily routine
   - Morning: how to check the dashboard
   - During the day: how to upload photos
   - End of day: how to back up
4. Common tasks (step-by-step screenshots)
   4.1 "A guest wants their photos"
   4.2 "I need to print a receipt"
   4.3 "A customer wants a refund"
   4.4 "I'm running out of disk space"
   4.5 "I need to add a new photographer"
   4.6 "I need to change prices for the season"
5. When something goes wrong
   5.1 "Touch shows a red bar"
   5.2 "Photos aren't appearing"
   5.3 "I forgot my password"
   5.4 "Internet is down"
   5.5 "Who do I call? (escalation tree with phone numbers)"
6. Monthly tasks
   - Reconciling MoneyTrash payouts
   - Photographer payroll
   - Inventory check
7. Glossary
8. Index
```

### Acceptance
- A non-technical hotel manager can: turn on the system, log a customer order, and call the right support number — within 15 minutes of opening the PDF.
- Translated to: EN, FR, ES (priority), DE, IT (Q4).

---

## 3. Doc 2 — Photographer Manual

> *Audience: A 28-year-old resort photographer. She knows iOS, doesn't know command lines. She shoots and uploads, mostly. She needs to know: how do I get my photos from my camera to the system and from the system to a customer.*

### Outline
```
1. Your day with ClickFlash
2. The 3-step shoot-to-share flow
   2.1 Plug in your SD card → photos appear
   2.2 Cull + tag + face-group
   2.3 Share with guests
3. The album editor (most-used features)
4. Face recognition: how it works, how to fix mistakes
5. MoneyTrash: what it is, when it kicks in
6. Troubleshooting
7. Shortcuts (1-page cheat sheet)
```

### Acceptance
- A photographer can: ingest a card, cull 200 photos to 40, and create an album in < 20 minutes.

---

## 4. Doc 3 — Kiosk Quick-Start (1 A4 page)

> *Audience: A vacationing guest. She does not want to read. She wants to find her photos and buy prints.*

```
┌─────────────────────────────────────────────────────┐
│   HOW TO FIND YOUR PHOTOS                           │
│                                                     │
│   1.  Type your room number  [   205   ]            │
│                                                     │
│   2.  Tap YOUR photo                                 │
│                                                     │
│   3.  Pick what you want:                            │
│        □ Digital download ($9.99)                    │
│        □ 8x10 print ($14.99)                         │
│        □ Full album ($49.99)                         │
│                                                     │
│   4.  Tap your card. Wait. Take your receipt.        │
│                                                     │
│   Need help?  Press the red button.                  │
│                                                     │
│   Photos will be on your phone in 5 minutes.         │
│   We text you the link.                              │
└─────────────────────────────────────────────────────┘
```

### Acceptance
- Tested with 5 first-time users, 5/5 complete a purchase in < 90 seconds.

---

## 5. Doc 4 — Install Admin Manual (60 pages)

> *Audience: A contract IT admin at a resort, paid $200 to install the system. He needs a runnable PowerShell script, not prose.*

### Outline
```
1. Pre-flight checklist
   - Network requirements
   - Power/UPS
   - What HQ sends you (a USB stick with bootstrap.zip)
2. The 10-minute install (the wizard)
   - Walkthrough of all 7 steps with screenshots
   - What to do when step 4 (pair Touch) fails
3. The 30-minute config (advanced)
   - Editing the local .env
   - SQLCipher key rotation
   - Adding a printer
   - Setting up the network firewall
4. Multi-Master in one resort
5. Multi-Touch in one Master
6. Recovery procedures
   - "The Master won't boot"
   - "I lost the pairing"
   - "I need to re-image the PC"
7. Uninstall
8. Logging a support ticket (what to send us)
```

### Acceptance
- An IT admin with no prior ClickFlash experience can install a 3-Master + 9-Touch resort in < 4 hours.

---

## 6. Doc 5 — Cloud Ops Runbook (80 pages)

> *Audience: A Cloud engineer at HQ, on-call 24/7. He needs a runbook: "if X, do Y".*

### Outline
```
1. Fleet dashboard
   - What the green/yellow/red dots mean
   - How to drill into a Master
2. Incident response
   2.1 "Master offline > 5 min"
   2.2 "Heartbeat lag > 60s"
   2.3 "Disk usage > 80%"
   2.4 "Stripe webhook failing"
   2.5 "D1 write conflict"
   2.6 "R2 4xx/5xx spike"
3. Routine operations
   3.1 Adding a new region
   3.2 Pushing a config update
   3.3 Rolling a new Master release
   3.4 Rolling a new Cloudflare Worker
4. Disaster recovery
   4.1 "We lost a region" (D1 multi-region)
   4.2 "A studio's R2 was wiped"
   4.3 "Stripe account is locked"
5. Quarterly: GDPR data export
6. Quarterly: secret rotation
```

### Acceptance
- A new on-call engineer can resolve 90% of incidents in < 30 minutes using only the runbook.

---

## 7. Doc 6 — Developer Setup (refreshing what exists)

> *The existing `SETUP.md` is 84 lines and assumes too much. We rewrite to 100+ lines.*

### Outline
```
1. Prerequisites (Node 20+, pnpm 10+, Rust 1.83+ for Tauri, C++ 20+ toolchain for master-cpp)
2. Clone + pnpm install
3. Running each app locally
4. The Docker Compose dev stack
5. Working with Cloudflare locally (Miniflare, wrangler dev)
6. The 5 test suites and what they cover
7. CI: how a PR gets green
8. Release: how a version gets cut
9. Debugging across the stack (trace IDs in headers, log levels, Sentry)
10. The 7 anti-patterns we don't allow
```

---

## 8. Doc 7 — Security (refresh of existing `SECURITY.md`)

### Add
- **Data flow diagram** (where every byte of customer data lives, in transit and at rest)
- **Threat model** (STRIDE-per-component, with the actual mitigations)
- **Key custody** (who holds what, how it's rotated, who can revoke)
- **Incident response plan** (P0–P3 with SLA: detect < 5 min, contain < 60 min, notify < 72 hr per GDPR Art. 33)
- **Vendor sub-processors** (Cloudflare, Stripe, Resend, OpenAI/Gemini, Sentry, Logflare)

### Acceptance
- Passes an external pen-test (engaged by HQ).
- GDPR Art. 32 "appropriate measures" language in place.

---

## 9. Doc 8 — Legal (EULA, Privacy, DPA)

### EULA (10 pages)
- Standard SaaS terms
- Use restrictions (no illegal content, no reverse engineering)
- Data ownership (customer owns the photos, we own the platform)
- Termination + data export
- Liability cap

### Privacy (3 pages)
- Plain English: "What we collect, why, who we share with, how to delete"

### DPA (2 pages, GDPR Art. 28)
- ClickFlash as processor, studio as controller
- Sub-processors list
- Data residency options
- Right to audit (1×/year, 30-day notice)

### Acceptance
- Reviewed by external counsel.
- Translated to: EN, FR, ES.

---

## 10. The 6-week doc plan

| Week | Doc | Effort | Owner |
|---|---|---|---|
| W1 | Doc 3 (Kiosk Quickstart) — 1 page, fast | 1 day | Designer + writer |
| W1 | Doc 8 (EULA + Privacy + DPA) — drafted by counsel | 5 days | Legal |
| W2 | Doc 1 (Studio Manager) — first 20 pages | 1 week | Tech writer |
| W3 | Doc 1 (Studio Manager) — last 20 pages + 5-min video script | 1 week | Tech writer + designer |
| W4 | Doc 4 (Install Admin) — full | 1 week | Electron eng + writer |
| W5 | Doc 5 (Cloud Ops Runbook) — first 50 pages | 1 week | CF eng + writer |
| W6 | Doc 5 (last 30 pages) + Doc 2 + Doc 6 + Doc 7 refresh | 1 week | All |

---

## 11. Acceptance for "doc suite shipped"

- [ ] All 8 documents exist at the root of the repo (or `docs/USER/`).
- [ ] Each has a single PDF export checked in for download offline.
- [ ] Each has a "last reviewed" date and a reviewer name.
- [ ] Each has been read end-to-end by at least one person who is **not** the author.
- [ ] The Kiosk Quickstart is printed and posted at 1 actual customer site.
- [ ] The Cloud Ops Runbook is used in a live on-call rotation for 1 week without paging the author.
- [ ] The EULA + Privacy + DPA are linked from the installer's first-run screen and from the Customer Gallery footer.

---

*End of docs plan — proceed to file 06.*
