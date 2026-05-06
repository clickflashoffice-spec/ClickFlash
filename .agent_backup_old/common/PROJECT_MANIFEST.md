# Agent Project Manifest

> [!NOTE]
> This directory serves as the "Mission Control" for the Antigravity Agent. It adheres to the "Expert Mode" architectural separation.

## Directory Structure

### 1. Active Context

- **`rules/`**: Immutable Operational Laws & Protocols. (Read-Only reference).
- **`skills/`**: Library of agent capabilities. (Read-Only reference).
- **`common/`**: Shared context, architecture diagrams, and roadmap.
- **`docs/`**: Project documentation (Setup, FAQ, Guides).
- **`audit_reports/`**: Deep scans and analysis outputs.
- **`plans/`**: Active implementation plans (In-Progress).

### 2. State & History

- **`memory/`**: Persisted agent state (scratchpad, session logs).
- **`archive/`**: Retired plans, old reports, and completed phase documents.

### 3. Root Files

- **`task.md`**: The current active task board.

### 4. Monorepo Structure (Git Verified)

- **`e:\ClickFlash`**: Root Repository
- **`master-app/react-new-backup`**: **Master App** (Main)
- **`touch-app/react`**: **Touch App** (Main)
- **`web/`**: Online Ecosystem (6+ Sub-projects)

## Maintenance Protocol

- **Archiving**: When a Phase is complete, move its `task.md` or status files to `archive/`.
- **New Plans**: Create new plans in `plans/`, not root.
- **Rules**: Do not modify `rules/` without explicit "Constitutional Amendment" approval.

*Last Updated: 2026-01-21*
