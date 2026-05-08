# Deep Dive & Reorganization Plan

> [!IMPORTANT]
> This plan executes the "System Architect" transition requested by the user, cleaning up the cluttered `.agent` directory and establishing a strict "Expert Mode" structure.

## Goal

Transform the `.agent` directory from a flat list of 69+ loose files into a structured, scalable "Mission Control" center.

## Phase 1: Structure Creation

Establish the following directory schema based on `reorg_spec.md`:

```text
e:/ClickFlash/.agent/
├── rules/                    # (KEEP) Operational Laws
├── skills/                   # (KEEP) Agent Skills
├── memory/                   # (KEEP) persisted state
├── archive/                  # (KEEP) Old artifacts
├── common/                   # [TARGET] Shared context (roadmap, architecture)
├── docs/                     # [TARGET] Project documentation
├── audit_reports/            # [TARGET] Analysis reports (bundle, deep scan)
└── plans/                    # [TARGET] Active/Pending plans (not archive)
```

## Phase 2: The Great Migration

Move loose files to their semantic homes.

### Group 1: Archive (Stale Plans & Context)
>
> **Action**: Move to `.agent/archive/`

- `phaseXX_*.md` (All phase complete/status files)
- `implementation_plan_*.md` (Old feature plans)
- `*_plan.md` (Specific feature plans like `gallery_watermark_plan.md`)
- `*_session.md`, `*_report.md` (One-off reports)
- `scratchpad.log.bak`

### Group 2: Common Context
>
> **Action**: Move to `.agent/common/`

- `project_overview.md`
- `system_architecture_reference.md`
- `roadmap.md`
- `production_deployment_config.md`

### Group 3: Documentation
>
> **Action**: Move to `.agent/docs/`

- `FAQ.md`
- `GETTING_STARTED.md`
- `CONTRIBUTING.md`
- `CHANGELOG.md`
- `LICENSE`
- `react_deployment_guide.md`
- `network_testing_guide.md`

### Group 4: Audit Reports
>
> **Action**: Move to `.agent/audit_reports/`

- `DEEP_SCAN_*.md`
- `bundle_analysis_findings.md`
- `bundle_optimization_plan.md`
- `import_optimization_summary.md`

## Phase 3: Task Board Reset

1. Archive current `task.md` to `.agent/archive/task_phase46_stabilization.md`.
2. Create fresh `task.md` focused on the Reorganization and "Expert Mode" adoption.

## User Review Required

- **Breaking Change**: File paths in `task.md` or other linked docs might break. (Accepted as part of reorg).
- **Scope**: This only affects `.agent/`, not the actual app source code in `master-app` or `touch-app`.
- **Note**: This plan is stored in the Agent Brain. Once approved, I will replicate the new structure in `e:/ClickFlash/.agent/` as per Law 11.

## Verification

- Run `ls -R .agent` to confirm clean root.
- Verify `task.md` is readable.
- Verify `rules` are accessible.
