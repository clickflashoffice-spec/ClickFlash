# UI, UX, and Accessibility Audit

## Conclusion

Accessibility and cross-surface UX assurance are **Partial**. Static route/control inspection found coherent application shells and many explicit labels, but no complete keyboard, screen-reader, zoom/reflow, contrast, touch-target, motion, error-announcement, or kiosk assistive-technology run was performed. No WCAG conformance claim is made.

The audit maps risks to [WCAG 2.2](https://www.w3.org/TR/WCAG22/), the current W3C Recommendation inspected on 2026-07-25. WCAG conformance applies to complete pages and complete processes; source snippets alone cannot establish it.

## Surface assessment

| Surface | Strengths observed | UX/accessibility risks | Status |
|---|---|---|---|
| Master | Dense operational workflows; dashboard/navigation structure; reusable local controls | Very high interaction density; complex tables/dialogs; offline/device/error states need task-based keyboard and AT testing | Partial |
| Touch | Purpose-built state flow and large kiosk interaction model | Touch target, timeout, focus recovery, virtual keyboard, screen-reader, payment/printer/device recovery unproven | Partial |
| MoneyTrash | Clear batch-upload concept, progress-oriented service model | Primary picker/drop flows are functionally broken; cancellation not exposed; failure copy cannot compensate for unreachable native path | Broken |
| Management | Broad admin feature coverage and consistent layout selection | Highest admin complexity; destructive/financial actions need confirmation, error prevention, focus management, and permission clarity | Partial |
| Gallery | Photo-first gallery/store/favorites/download views | Protected download defect; commerce recovery, image alternatives, keyboard gallery navigation, loading/status announcements unproven | Partial |
| Website | Broad marketing/legal route coverage and responsive framework | Route presence does not prove content quality, form errors, focus, reflow, contrast, or conversion-path resilience | Partial |
| Installer | Sequential wizard model reduces cognitive load | Privileged failures, progress, cancellation/rollback, secret handling, and focus on step changes untested | Partial |
| License Generator | Narrow tab-based tool | Key-generation warnings, copy/export confirmation, keyboard tabs, and secret non-disclosure need runtime review | Partial |
| Mobile Client | Expo starter screens | Not a product-complete experience; placeholder content and external tutorial links | Experimental |
| Mobile Photographer | Real workflow labels coexist with starter residue | Navigation consistency, permissions, camera/biometric consent, offline recovery, and device accessibility unproven | Partial |
| Mobile Customer | Face search/gallery/order/QR/selfie route intent | Sensitive permission/consent and accessible camera alternatives not established | Partial |
| Mobile Staff | Broad operational route set | Role clarity, offline conflicts, destructive confirmation, scanner/camera alternatives unproven | Partial |

## Design-system consistency

`packages/ui` exists, but local Button, Card, ErrorBoundary, Input, Modal, Spinner, and Toast implementations remain duplicated across Master, Touch, Gallery, and Management. This creates divergent keyboard, focus, error, theme, and disabled/loading behavior.

Recommended consolidation sequence:

1. Inventory variants and behavior contracts before changing visuals.
2. Establish shared accessibility primitives: focus trap/return, labelled dialogs, field association, error summary, live regions, loading/disabled semantics, target-size tokens.
3. Migrate one low-risk surface, then Gallery and Touch critical journeys, then operational desktops.
4. Add component tests plus full-process accessibility gates; do not infer conformance from automated scans alone.

## WCAG 2.2 verification matrix

| Criterion area | Source evidence | Required runtime verification | Current result |
|---|---|---|---|
| 1.1.1 Non-text Content | Photo-heavy UIs and image components exist | Meaningful alt strategy, decorative handling, image status/error alternatives | Unknown |
| 1.3.1 Info and Relationships | Semantic React markup appears in samples | Headings, tables, groups, form associations across every page/state | Partial |
| 1.4.3 / 1.4.11 Contrast | Theme/Tailwind tokens exist | Computed contrast in light/dark/disabled/error/focus states | Unknown |
| 1.4.10 Reflow | Responsive utilities present | 320 CSS px and 400% zoom without loss of content/action | Unknown |
| 2.1.1 Keyboard | Native controls and handlers coexist | Complete no-mouse journey, no traps, custom widget behavior | Unknown |
| 2.4.3 / 2.4.7 / 2.4.11 Focus | Dialogs/navigation exist | Logical order, visible and unobscured focus after route/modal/state changes | Unknown |
| 2.5.7 Dragging Movements | MoneyTrash and gallery interactions include drag-like behavior | Non-drag alternative with equivalent result | Partial/Broken |
| 2.5.8 Target Size | Touch/mobile/kiosk surfaces exist | Measure actionable targets and spacing on devices | Unknown |
| 3.3.1-3.3.4 Input Assistance | Forms/wizards/orders exist | Error identification, suggestions, labels, irreversible transaction review | Partial |
| 3.3.8 Accessible Authentication | Auth/QR/biometric paths exist | No cognitive-function-only barrier; alternatives and recovery | Unknown |
| 4.1.2 Name, Role, Value | React/native controls sampled | Accessibility tree verification for custom controls | Unknown |
| 4.1.3 Status Messages | Upload/sync/order status UIs exist | Screen-reader announcements without forced focus | Unknown |

## Photo-workflow-specific UX risks

- Large previews, RAW files, and thumbnail grids need progressive loading, cancellation, memory-pressure behavior, and clear quality states.
- Face/selfie flows need plain-language consent, alternative discovery paths, retention/deletion controls, and avoidance of coercive dark patterns.
- Kiosk inactivity, privacy-screen reset, abandoned order cleanup, and public-device logout need explicit timed-state testing.
- Offline capture/order/upload must distinguish queued, syncing, failed, verified, and safe-to-delete states.
- Operators need actionable, redacted diagnostics rather than raw implementation errors.

## Acceptance gate

Before any public or staff release, test the complete critical journeys in `07-user-journeys-and-data-flows.md` using keyboard-only input, one Windows screen reader, mobile VoiceOver/TalkBack as applicable, 200% and 400% zoom/reflow, light/dark/high-contrast modes, reduced motion, touch-only kiosk operation, network failure, and validation errors. Record page/state/assistive-technology/version evidence and remediate every A/AA failure.

Evidence: EVID-0007 and EVID-0018. Finding: CF360-UX-001.
