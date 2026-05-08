---
name: commit
description: Git workflow, commit conventions, and worktree management for ClickFlash.
triggers:
  - commit
  - git
  - push
  - branch
  - worktree
---

# Commit: Git Workflow

## Auto-commit behavior
A Stop hook in `.claude/settings.json` auto-commits and pushes at session end.
- Guard: `git diff --quiet HEAD` — no empty commits
- Message: `chore(claude): auto-commit session changes`
- **For meaningful changes, commit manually with a descriptive message before the session ends**

## Commit format (enforced by husky commit-msg hook)
```
type(scope): description
```
**Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`, `ci`, `build`

**Scope**: single kebab-case word — the app or package affected
- Correct: `fix(gallery)`, `feat(master)`, `chore(ci)`, `refactor(shared)`
- Wrong: `fix(gallery,management)` — husky rejects commas in scope

## Common git operations
```bash
# Stage only tracked files (safe — won't accidentally include .env)
git add -u

# Stage everything (confirm .claudeignore covers secrets first)
git add -A

# Check what will be committed
git diff --staged

# Commit with message
git commit -m "feat(gallery): add offline photo sync"

# Push current branch
git push origin HEAD

# Push new branch with tracking
git push -u origin HEAD
```

## Worktree workflow
Active worktrees are in `.claude/worktrees/` (see MEMORY.md for current list).

```bash
# List all worktrees
git worktree list

# Create a new worktree for a feature
git worktree add .claude/worktrees/my-feature -b feature/my-feature

# Remove a finished worktree
git worktree remove .claude/worktrees/<name>
git branch -d <branch-name>
```

## Branch naming for Claude Code branches
`claude/<adjective>-<name>-<short-hash>`
Examples: `claude/adoring-bassi-ff2552`, `claude/laughing-blackwell-f03c04`

## Rules
- Never force-push to `main` — use PR workflow
- Never `git reset --hard` without `git status` first
- Merge conflicts in shared `packages/`: prefer the version with stricter types
- Never commit `.env` files — verify with `git diff --staged | grep -i secret` before committing
