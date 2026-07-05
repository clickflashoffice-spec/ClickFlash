---
sidebar_position: 2
title: Development Setup
description: Development environment setup for ClickFlash — Antigravity agent configuration, workspace skills, and tooling.
---

# ClickFlash Development Setup

**Version:** 2.0.0 | **Date:** May 2026

## Current Structure

| Path | Status | Purpose |
|------|--------|---------|
| `.agent/` (workspace) | ✅ Clean (6 skills) | Workspace skills |
| `~/.gemini/antigravity/skills/` | ✅ 1,428 skills | Global skills |

### Workspace Skills (`.agent/skills/`)

| Skill | Purpose |
|-------|---------|
| `@planning-with-files` | Structured planning |
| `@code-reviewer` | Code quality reviews |
| `@debugger` | Debugging methodologies |
| `@react-best-practices` | React patterns |
| `@frontend-developer` | Frontend patterns |

### Global Skills

**1,428+ skills** at `~/.gemini/antigravity/skills/`

## Key Commands

```bash
# Force reinstall (clears and reinstalls)
npx antigravity-awesome-skills --antigravity

# Update skills only
cd ~/.gemini/antigravity && git pull
```

## Hidden Files Cleanup

If Antigravity still crashes:

1. **Clean workspace brain**:
   ```bash
   rm -rf ~/.gemini/antigravity/brain/*
   ```

2. **Clear conversation history** (if needed):
   ```bash
   rm -rf ~/.gemini/antigravity/conversations/*
   ```

## Token Optimization Tips

1. Use **Flash** for: Simple queries, routine tasks
2. Use **Pro** for: Planning, complex tasks
3. Summarize contexts over 10+ tool uses
4. Reference rules instead of repeating

## Resources

- [Antigravity Awesome Skills Catalog](https://sickn33.github.io/antigravity-awesome-skills/)
- [Skills CLI Docs](https://github.com/sickn33/antigravity-awesome-skills)
