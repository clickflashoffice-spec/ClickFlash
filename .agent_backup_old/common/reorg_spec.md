# Agent Folder Reorganization Specification

**Goal**: Organize the `.agent` folder to support the "Expert Mode" separation and reduce clutter.

## Current State

Flat structure with mixed prefixes (`cpp_*`) and generic names (`implementation_plan.md`).

## Proposed Structure

```text
e:\master os\New folder\.agent\
├── rules/                    # (Reference) Operational Laws & Protocols
│   └── ...
├── skills/                   # (Reference) Agent Skills
│   └── ...
├── memory/                   # [NEW] State persistence
│   ├── scratchpad.log        # Active session state
│   └── history/              # Archived task files

├── common/                   # [NEW] Shared/Global Context
│   ├── roadmap.md            # (Moved from root roadmap.md)
│   └── ARTIFACT_STORAGE.md   # (Moved from root)
└── docs/                     # [NEW] Reference Documentation
    └── react_to_cpp_mapping.md # (Moved from root)
```

## Migration Actions

1. **Create Directories**: `memory`,  `common`, `docs`.
2.
3. **Update Task View**:
    - Point active task to one of the new locations (or keep a root `task.md` as a symlink/pointer).

## Verification

- Check all files are moved.
- Verify no data loss.
- Confirm `GLOBAL_RULES_MANIFEST.md` remains accessible.

## User Approval Required

Does this structure align with your mental model?
Type "Approved" to proceed.
