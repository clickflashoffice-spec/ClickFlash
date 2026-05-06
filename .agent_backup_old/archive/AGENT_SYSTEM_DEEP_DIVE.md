# ClickFlash Agentic System Deep Dive

## 🤖 Antigravity Mission Control

**Version:** 5.0.0  
**Classification:** Core Agentic Operating System (AOS)

---

## 1. System Overview

The ClickFlash Agentic System (Antigravity) is a structured, autonomous operating layer that governs the development and maintenance of the ClickFlash ecosystem. It operates as a "Senior Architect" and "Mission Control" for all coding tasks, ensuring adherence to the core offline-first principles and operational laws.

### 1.1 Core Architecture

The system is organized into five primary pillars:

| Pillar | Purpose | Contents |
|--------|---------|----------|
| **Rules** | Governance | Operational Laws, Expert Mode, Mission Control rules |
| **Skills** | Capabilities | specialized toolsets (3D, AWS, Pentesting, etc.) |
| **Common** | Standards | System prompts, communication styles, linting configs |
| **Memory** | Knowledge | Global context, project-specific history, KIs |
| **Workflows** | Execution | Step-by-step procedures for complex tasks |

---

## 2. Technical Ecosystem Audit (Current State)

### 2.1 Application Matrix

The ecosystem consists of **7 active applications** and one legacy prototype:

| App | Key Tech | Role | Status |
|-----|----------|------|--------|
| **Master Portal** | Electron + React 19 | Core Brain / Local HQ | ✅ Active |
| **Touch Kiosk** | Electron + React 19 | Customer Interface (Offline) | ✅ Active |
| **Money Trash** | Next.js 15 | Field Asset Ingestion | ✅ Active |
| **Management Hub**| React 19 + Vite | Central Admin Dashboard | ✅ Active |
| **Customer Gallery**| React 19 + Vite | Online Client Portal | ✅ Active |
| **Main Website** | Next.js 15 | Marketing & Landing Pages | ✅ Active |
| *Mobile App* | *React Native* | *Photographer Companion* | ⏳ Deferred |
| *Delivery App* | *Node.js* | *Legacy Prototype* | 🏗️ Legacy |

### 2.2 Port Standardization

All applications are mapped to consistent ports for local development and LAN communication:

| App | Port | Purpose |
|-----|------|---------|
| Master Portal (API) | 8090 | Primary Backend & Sync Server |
| Touch Kiosk (API) | 8091 | Local Watchdog & Backend |
| Management Hub | 5173 | Dashboard Frontend |
| Customer Gallery | 5174 | Gallery Frontend |
| Money Trash | 3000 | Uploader Frontend/API |
| Main Website | 3001 | Marketing Frontend/API |

---

## 3. Governance & Operational Constraints

### 3.1 The 16 Operational Laws

The system is governed by 16 immutable laws (detailed in `02-operational-laws.md`):

1. **Dual-Scope Path Guard**: Always confirm Master vs Touch context.
2. **Order Mirroring**: Touch creates locally, pushes to Master.
3. **Finalized Face Recognition**: Master indexes, Touch searches.
4. **Scope Integrity**: Prevent cross-contamination.
5. **Data Role Separation**: Master processes, Touch displays.
6. **Touch Local Fetch**: Touch reads only from its local folder.
... *(refer to full laws for details)*

### 3.2 Offline-First Mandate

The most critical constraint is the **Zero Internet Mandate**. The core ecosystem (Master + Touch) must function 100% without internet, utilizing Ethernet/LAN for all inter-app communication.

---

## 4. Current Technical Debt & Roadmap

- **Monolith Refactoring**: `AlbumDetail.tsx` (Master) requires further decomposition.
- **Test Coverage**: Increasing unit and E2E testing using Vitest and Playwright.
- **Documentation**: Constant audit of `.agent` artifacts to prevent drift from implementation.
