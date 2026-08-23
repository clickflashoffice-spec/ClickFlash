# Design System: ClickFlash Autonomous Ecosystem V7.0
**Project ID:** `projects/clickflash-v7-enterprise`

## 1. Visual Theme & Atmosphere
The ClickFlash design philosophy embodies **"Tactical Cyber-Luxury"** — an ultra-modern, high-performance edge computing atmosphere engineered for premier luxury resorts, waterparks, and cruise concessions. The visual language blends military-grade mission control density with frictionless consumer elegance.

* **Atmosphere:** Deep Space Tactical Obsidian with High-Frequency Cyan and Neon Violet energy glows. Surfaces feel tangible yet ethereal through multi-layered glassmorphic depth (`backdrop-blur-2xl`), crisp micro-borders (`border-white/10`), and whisper-soft neon ambient shadows.
* **Density:** Balanced & Adaptive — high information density for operational telemetry dashboards (Command Center / Equipment Hub) shifting seamlessly into spacious, thumb-first ergonomic touch layouts for guest self-service kiosks and mobile checkout.
* **Aesthetic Philosophy:** Zero-clutter, content-first imagery showcase. The UI recedes into the background to allow high-dynamic-range vacation media, 3D Gaussian Splats, and biometric capture journeys to command visual focus.

---

## 2. Color Palette & Roles

| Descriptive Name | Hex Code | Functional Role |
| :--- | :--- | :--- |
| **Tactical Canvas Obsidian** | `#0B111F` | Primary application background canvas (Dark Mode default) |
| **Sub-Surface Card Navy** | `#131C31` | Elevated container cards, navigation sidebars, and drawer modals |
| **Edge Horizon Stroke** | `#1E293B` | Structural dividers, grid line borders, and table row outlines |
| **Electric Cyan Primary** | `#06B6D4` | Primary CTAs, active telemetry pulses, camera fleet indicators |
| **Neon Electric Violet** | `#8B5CF6` | Secondary accent, AI Co-Pilot insights, Swarm negotiations |
| **Hyper-Spectral Emerald** | `#10B981` | Successful print jobs, verified biometric matches, revenue gains |
| **Amber Warning Glow** | `#F59E0B` | Equipment low-battery alerts, thermal printer paper warnings |
| **Crimson Critical Surge** | `#EF4444` | Hardware tamper locks, review defense intercepts, drawer deficits |
| **Pristine Crystal White** | `#F8FAFC` | High-contrast heading typography and foreground iconography |
| **Muted Slate Luminescence** | `#94A3B8` | Secondary labels, metadata timestamps, and inactive toggle states |

---

## 3. Typography Rules
* **Primary Typeface:** `Inter`, `SF Pro Display`, system-ui, `-apple-system`, `sans-serif`
* **Monospace / Telemetry Typeface:** `JetBrains Mono`, `Fira Code`, `ui-monospace`
* **Scale & Hierarchy:**
  * **Hero Display Titles:** `text-3xl` to `text-5xl` (32px–48px), `font-black tracking-tight`, paired with `.text-gradient` (Cyan-to-Violet) and `.text-glow`.
  * **Section Headers:** `text-xl` to `text-2xl` (20px–24px), `font-bold tracking-tight text-white`.
  * **Card & Module Titles:** `text-base` to `text-lg` (16px–18px), `font-semibold text-slate-100`.
  * **Body & Data Grid:** `text-sm` (14px), `font-medium leading-relaxed text-slate-300`.
  * **Micro Telemetry & Badge Metadata:** `text-xs` (11px–12px), `font-semibold tracking-wider uppercase font-mono`.

---

## 4. Component Stylings

### Buttons & Interactive CTAs
* **Primary Action:** Pill / Rounded-XL (`rounded-xl`), solid Cyan `#06B6D4` with dynamic glow shadow (`shadow-lg shadow-cyan-500/25`), transitioning to brightness boost on hover (`hover:brightness-110`) and micro-compression on click (`active:scale-95`). Minimum hit target: `44px` (mobile/touch `52px`).
* **Secondary / Glass:** Semi-transparent frosted backdrop (`bg-white/10 backdrop-blur-xl border border-white/20`), crisp white text, ambient hover reflection.
* **Premium Swarm Glow:** Multi-stop linear gradient (`from-cyan-500 via-indigo-500 to-purple-500`) with high-voltage border aura.

### Cards & Container Panels
* **Geometry:** Generously rounded corners (`rounded-2xl` / `rounded-3xl` for kiosks).
* **Surface Treatment:** Frosted Obsidian (`bg-slate-900/60 backdrop-blur-2xl border border-white/10`).
* **Depth & Elevation:** Diffused ambient elevation (`box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37)`). Hover states elevate smoothly by `-4px` with enhanced border luminosity (`hover:border-cyan-400/40`).

### Forms, Filters & Inputs
* **Geometry:** Subtly rounded rectangles (`rounded-xl`).
* **Surface & Stroke:** Recessed Obsidian tint (`bg-slate-950/60 border border-slate-800`), crisp focus ring (`focus:ring-4 focus:ring-cyan-500/20 focus:border-cyan-400`).
* **Icon Adornments:** Left-pinned monochrome icons in `text-slate-400` with instant active state highlights.

---

## 5. Layout Principles & Viewport Adaptations
* **Whitespace Strategy:** 8-point spatial grid system (4px, 8px, 16px, 24px, 32px, 48px). High breathing room around hero imagery and compact 12px gutter grids for high-throughput telemetry.
* **Touch Kiosk (1080x1920 Portrait / 1920x1080 Landscape):** Oversized `56px+` touch targets, high-contrast screensaver attract loops, and zero keyboard requirements.
* **Management Command Center (1440px+ Desktop):** Fixed left navigation rail (`w-64`), multi-column bento grids, real-time WebRTC camera streams, and sticky status bar telemetry.
* **Guest Self-Service PWA (375px–428px Mobile):** Sticky bottom floating checkout pill, horizontal swipeable story carousels, and biometric selfie scanning portal.
