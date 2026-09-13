# ClickFlash — 30-60-90 Day Onboarding Playbook

> **Mission:** Transform incoming founding engineers and sales leads into high-velocity autonomous contributors within 30 days while protecting the CTO's engineering flow.

---

## 1. Engineering Onboarding Track (Field Systems, Full-Stack, Mobile)

### Day 1: Machine Setup & First Green Build
- **Hardware Kit:** 32GB RAM workstation / laptop, test Nikon DSLR with USB-C/OTG tether cable, DNP test printer (for Field Systems role), BLE beacon kit.
- **Access Provisioning:** GitHub organization invite, 1Password team vault, private Discord / Slack channels.
- **Verification Milestone:**
  ```powershell
  # Clone and install
  git clone https://github.com/clickflash/clickflash.git
  cd clickflash
  pnpm install

  # Execute non-negotiable verification sequence
  npm run typecheck:all
  pnpm --filter clickflash-master test
  npm run test:packages
  ```
  *Exit Criterion:* Clean exit code `0` on all checks before close of Day 1.

---

### Week 1: First Production PR & System Immersion
- **Reading Assignment:**
  - [`AGENTS.md`](file:///c:/Users/alamo/Desktop/ClickFlash/AGENTS.md) & [`.agents/rules/`](file:///c:/Users/alamo/Desktop/ClickFlash/.agents/rules/)
  - [`docs/ADR/012-hardened-hybrid-appliance.md`](file:///c:/Users/alamo/Desktop/ClickFlash/docs/ADR/012-hardened-hybrid-appliance.md)
  - Architectural overview in `docs/apps/master.md` and `docs/apps/gallery.md`.
- **First Task Assignment (Good First Issue):**
  - *Field Systems Engineer:* Implement dynamic USB reconnect retry logic in `HardwareService.ts`.
  - *Senior Full-Stack Engineer:* Add responsive image skeleton loaders in `apps/gallery`.
  - *Mobile Engineer:* Add battery-saving background scan throttle to `useBleScanner.ts`.
- *Exit Criterion:* First PR reviewed, approved, and merged with 100% passing tests.

---

### Month 1 (30 Days): Core Component Ownership
- **Field Systems Engineer:** Fully configure a staging Master OS appliance, simulate 2,000 photo in-rush, and execute a simulated blackout failover test.
- **Senior Full-Stack Engineer:** Take full code ownership of `apps/gallery` and `apps/management`, reducing bundle size and improving lighthouse metrics.
- **Mobile Engineer:** Complete the camera-tethering test harness on physical Android hardware and sync 100 test shots to Master over local LAN.

---

### Month 2 (60 Days): Production Deployment & Pilot Shadowing
- Accompany founder or autonomously deploy ClickFlash edge appliances at a live pilot resort.
- Monitor real-time telemetry (print queues, camera tether drops, guest gallery conversions).
- Triage real field issues and contribute fixes directly to the Master codebase.

---

### Month 3 (90 Days): Full Autonomy & Sprint Leadership
- Propose and author new Architectural Decision Records (ADRs).
- Conduct technical interviews for Horizon 2 candidates (CV/ML Engineer, Customer Success).
- Deliver 99.9% uptime across all assigned pilot venues.

---

## 2. GTM / Sales Lead Onboarding Track

### Week 1: Product Mastery & Competitive Teardown
- Operate the ClickFlash Kiosk, Management Hub, and Mobile App as an end-user.
- Study incumbent competitor contracts (DEI, Pomvom, Magic Memories) and memorize key differentiation metrics (capture rate, guest spend, labor reduction).

### Month 1 (30 Days): Pipeline Architecture & Initial Outreach
- Build an active pipeline of 50+ qualified luxury resort accounts (Southeast Asia, Maldives, Caribbean).
- Launch outbound campaigns using [`OUTREACH_TEMPLATES.md`](./OUTREACH_TEMPLATES.md).
- Conduct 15+ discovery calls with resort General Managers and Concession Directors.

### Month 2 (60 Days): Pilot Negotiations
- Deliver 5 formal proposals for upcoming high-season pilots.
- Negotiate pilot concession agreements with dynamic yield rev-shares.

### Month 3 (90 Days): First Closed Contracts
- Close 3 paid resort pilot agreements ($15k+ MRR or guaranteed concession revenue).
- Establish repeatable sales playbook for Horizon 2 Account Executives.
