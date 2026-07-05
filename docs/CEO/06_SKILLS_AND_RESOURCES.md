# 06 — Skills Matrix & Resource Plan

> **The honest read:** We have 5 engineers touching the codebase today. We need 12 in 12 months. We cannot hire our way out of this quarter — so we plan for **5 engineers in parallel, owned by phase, with smart outsourcing for non-engineering work.**

---

## 1. The 5 engineers we have (real names redacted, roles kept)

| Role | Where they live | What they actually do |
|---|---|---|
| **Electron engineer #1** (senior) | Master + Touch full-stack | Owns `apps/master` and `apps/touch`. Knows Express + better-sqlite3 + mDNS + WebSocket better than anyone. |
| **Electron engineer #2** (mid) | Touch + Installer | Owns `apps/touch/main.ts` and `apps/installer`. Picked up React 19 + Electron 39 in the last 6 months. |
| **Cloudflare engineer #1** (senior) | Management + Gallery | Owns `apps/management/backend/src`. Knows D1, R2, Workers, Wrangler. Part-time on `apps/gallery`. |
| **C++ engineer #0.5** (contract) | master-cpp | Hasn't shipped yet. Waiting on Qt6 install. |
| **Designer / PM #0.5** (you, partial) | All apps | Designs + runs the plan + writes the docs. Also does devops when needed. |

That is **3.5 FTE** of engineering + 0.5 PM + you. Not enough.

---

## 2. The 12 we need in 12 months (target Q4 2026)

| # | Role | When | Where to find | Salary band |
|---|---|---|---|---|
| 1 | Electron engineer #3 (mid) | Q3 W1 | Remote EU/MA, strong TS+React | €70–90k |
| 2 | Cloudflare engineer #2 (mid) | Q3 W1 | Remote EU, Workers + D1 + R2 deep | €75–95k |
| 3 | C++ engineer (mid, Drogon) | Q3 W2 (or kill) | Remote, Drogon + SQLiteCpp | €80–100k |
| 4 | DevOps / SRE (mid) | Q3 W4 | Remote EU, GH Actions + Cloudflare + Docker | €70–90k |
| 5 | UX designer (mid) | Q3 W2 | Remote, kiosk + admin | €55–75k |
| 6 | QA engineer (mid, Playwright) | Q3 W4 | Remote EU | €55–75k |
| 7 | Tech writer (mid) | Q3 W3 (contract) | Remote, EN + FR + ES | €40/hr |
| 8 | Security engineer (fractional) | Q3 W4 | External CISO, 1 day/week | €2k/day |
| 9 | Stripe + payments engineer (mid) | Q4 W1 | Remote, PCI | €80–100k |
| 10 | Mobile engineer (PWA) | Q4 W2 | Remote, React + offline | €70–90k |
| 11 | Data engineer (mid) | Q4 W4 | Remote, Cloudflare Analytics + BigQuery | €70–90k |
| 12 | Product manager (mid) | Q4 W1 | Remote EU, B2B SaaS | €80–100k |

Total new FTEs: 12 (including 2 fractional). Cost: ~€1.4M / year fully loaded.

---

## 3. The 5 skills matrix (what we have, what we need, what we hire)

| Skill | Today (5) | Target (12) | Hire / Train / Outsource |
|---|---|---|---|
| **Electron + React 19 + TypeScript** | 2 senior + 1 mid | 4 senior + 2 mid | **Hire 2 mid (W1, W4)**. Intern train 1 (Q4). |
| **Cloudflare Workers + D1 + R2** | 1 senior | 2 senior + 1 mid | **Hire 1 mid (W1)**. |
| **C++17/20 + Drogon + SQLiteCpp** | 0.5 contract | 1 mid | **Hire 1 mid (W2) IF we keep master-cpp**. Otherwise skip. |
| **Stripe + payments / PCI** | 0.3 (part of CF eng) | 1 dedicated | **Hire 1 dedicated (Q4)**. Outsource PCI review. |
| **DevOps + CI/CD + Cloudflare** | 0.3 (you) | 1 mid | **Hire 1 mid (W4)**. |
| **UX / product design** | 0.5 (you) | 1 mid | **Hire 1 mid (W2)**. |
| **Security / GDPR** | 0.1 (you) | 0.5 fractional | **Outsource to fractional CISO (W4)**. |
| **QA + Playwright** | 0.5 (mixed across eng) | 1 mid | **Hire 1 mid (W4)**. |
| **Tech writing** | 0.2 (you) | 0.5 contract | **Outsource to contract writer (W3)**. |
| **Mobile (PWA / React Native)** | 0 | 1 mid | **Hire 1 mid (Q4 W2)**. |
| **Data engineering** | 0 | 1 mid | **Hire 1 mid (Q4 W4)**. |
| **Product management** | 0.5 (you) | 1 mid | **Hire 1 mid (Q4 W1)**. |

---

## 4. The 4 skills we are weak in today (and the plan)

### 4.1 Cloudflare Workers + D1 + R2 deep expertise
- **Risk:** Our entire cloud side is on Cloudflare. A single engineer leaving stalls 3 apps.
- **Plan:** Hire 1 mid this quarter. Pair-program with the senior. Cross-train the Electron engineers on `wrangler dev` and the Workers runtime.

### 4.2 C++ in 2026
- **Risk:** Either we kill master-cpp and we don't need this skill, or we keep it and we're 1 engineer short.
- **Plan:** Decide master-cpp in W7. If keep, hire immediately. If kill, re-allocate budget to mobile engineer.

### 4.3 Security + GDPR
- **Risk:** We have a `SECURITY.md` and a `gdprService.ts` but no human who has actually read GDPR Art. 32.
- **Plan:** Fractional CISO, 1 day/week. Runs the quarterly security audit workflow. Reviews every PR that touches auth, sync, or R2.

### 4.4 DevOps
- **Risk:** Our CI is GitHub Actions, our deploy is `wrangler deploy`, and the runbook is "ask the senior".
- **Plan:** Hire a mid. First 30 days: write the deploy runbook, set up GH Actions matrix caching, set up staging.

---

## 5. The training plan (what we teach the people we have)

### 5.1 Internal — 2 hours / week, all engineers
- **Week 1:** Offline-first sync — the SyncManager code walkthrough
- **Week 2:** Cloudflare Workers — D1 transactions, R2 signed URLs, the Hub's fleet routes
- **Week 3:** Electron security checklist — context isolation, CSP, safeStorage
- **Week 4:** Stripe webhooks — signing, idempotency, what happens on a 500
- **Week 5:** GDPR Art. 32 — data minimization, retention, the right to erasure
- **Week 6:** PCI-DSS SAQ-A — what we are and are not allowed to do

### 5.2 External — 1 conference per quarter, 1 engineer
- **Q3:** Cloudflare Summit (online, free) — both CF engineers
- **Q4:** JSConf EU — 1 Electron engineer
- **Q1 2027:** FOSDEM — 1 C++ engineer (if we keep master-cpp)
- **Q2 2027:** Stripe Sessions — the payments hire

### 5.3 Certifications (paid by HQ, expected to be used)
- **Cloudflare Certified:** 2 engineers by Q4
- **Stripe Certified:** 1 engineer by Q4
- **CIPP/E (GDPR):** 1 engineer by Q4

---

## 6. The tools & vendors we will pay for this year

| Tool | Purpose | Cost / month | Why |
|---|---|---|---|
| **Sentry** (Team) | Error tracking across all 7 apps | $26/mo × 7 apps = $182 | Already in 4 apps. Add to the other 3. |
| **Linear** | Project tracking | $8/user × 12 = $96 | Better than GitHub Projects for cross-app work. |
| **Notion** | Internal wiki + runbooks | $10/user × 12 = $120 | Already paying. |
| **1Password** | Secrets for the whole team | $8/user × 12 = $96 | Replaces shared `.env` files. |
| **Figma** | Design | $15/user × 2 = $30 | Designer + PM. |
| **Cloudflare Workers Paid** | $5/mo + usage | $50–200/mo | Add Workers AI for culling beta. |
| **Cloudflare R2** | Photo storage | $0.015/GB stored, $0.01/GB egress | Pay-as-you-go. |
| **Stripe** | Payments | 2.9% + 30¢ | Standard. |
| **Resend** | Transactional email | $20/mo + usage | Already paying. |
| **NotebookLM** | Research | Free (already have it) | Read research notes. |
| **Total** | | ~$700/mo + Cloudflare usage | |

---

## 7. The 3 organizational risks (and the plan)

### Risk 7.1 — Single points of failure
- The senior Electron engineer is the only person who has shipped a Master release in 2026.
- **Plan:** Pair every Electron PR with a non-Electron engineer for review. Have the Cloudflare engineer do at least 2 Electron releases this year.

### Risk 7.2 — Hiring lag
- Mid engineers in EU take 3–6 months to hire. Q3 hires may not start until Q4.
- **Plan:** Start sourcing today. Use 2 contract-to-hire for the urgent roles (CF eng, DevOps).

### Risk 7.3 — Burnout
- 3 engineers carrying 7 apps in 2026 is unsustainable.
- **Plan:** Hire aggressively. Cap WIP at 2 features per engineer. Force a 2-week "no new features, only bugs and tech debt" sprint every quarter.

---

## 8. The quarterly OKR snapshot (Q3 2026)

| Objective | Key Result | Owner | Status |
|---|---|---|---|
| **Ship the 1-click onboarding** | New destination live in < 10 min on a 50 Mbps link | Electron #1 + CF #1 | Open |
| **Harden what is in production** | Gallery 584 errors → 0; SQLite encrypted at rest by default; Touch autoUpdater wired | Electron #1 + Electron #2 + CF #1 | Open |
| **Decide master-cpp** | Go / no-go on the C++ port by W7 | C++ #0.5 + CEO | Open |
| **Write the user manuals** | Studio Manager + IT Admin manuals in EN/FR/ES | Tech writer + Electron #1 | Open |
| **Hire 4 engineers** | Electron #3, CF #2, DevOps, Designer | CEO | Open |

---

## 9. The 6 questions to ask yourself in 6 months

1. Did we hit the 10-minute onboarding target on a real customer install?
2. Did we hire 4 of the 4 in Q3?
3. Is the Gallery PCI clean?
4. Is the Kiosk Quickstart on the wall of a real resort?
5. Did the C++ pivot ship in Q4?
6. Are we net-promoter-positive in customer surveys?

If 5 of 6 are yes, we are a product. If 3 of 6, we are a tool. If 1 of 6, we are a project.

---

*End of skills & resources plan. This is the last file in the v6.0 plan.*
