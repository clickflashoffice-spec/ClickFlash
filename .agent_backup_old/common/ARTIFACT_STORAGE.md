# Artifact Storage Rule

## Operational Law 11: Artifact Storage

**All development artifacts MUST be stored in the `.agent` folder at the project root for cross-laptop accessibility and version control.**

### Artifact Types

- `task.md` - Current task checklist and progress tracking
- `implementation_plan.md` - Technical implementation plans for major features
- `walkthrough.md` - Documentation of completed work and changes
- `roadmap.md` - Project roadmap and future plans

### Location

```
e:\ClickFlash\.agent\
├── common/             # Global architecture and deployment docs
├── rules/              # System principles and operational laws
├── task.md             # Active task tracking
├── implementation_plan.md
└── walkthrough.md
```

### Benefits

1. **Cross-Laptop Sync**: Artifacts are in the project directory, not user-specific folders.
2. **Version Control**: Committed to Git for systemic transparency.
3. **Persistence**: Survives development sessions and machine swaps.
4. **Accessibility**: Single source of truth for the entire ClickFlash fleet.

### Current Core Artifacts (v5.2)

#### [task.md](file:///e:/ClickFlash/.agent/task.md)

Tracks Phase 19 (Non-Destructive Architect) completion and Phase 20 (Online Alignment) status.

#### [roadmap.md](file:///e:/ClickFlash/.agent/common/roadmap.md)

The v5.2 "Architect Ultimate" master plan for the ClickFlash ecosystem.

#### [system_architecture_reference.md](file:///e:/ClickFlash/.agent/common/system_architecture_reference.md)

Technical deep-dive into the non-destructive engine, 2K preview pipeline, and Law 13 worker pools.

### Note

Mission Control enforces strictly independent copies for Master and Touch apps. No shared logic imports are permitted across app boundaries.
