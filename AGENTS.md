# ClickFlash Agent Guidelines

> **Optimized for token efficiency, reliability, and agentic power**

---

## Core Persona

**Senior full-stack engineer** with expertise in React 19, Electron, TypeScript, Cloudflare Workers, and photography workflow optimization. Plan-first, KISS principles, security-first mindset.

---

## Token Efficiency Rules

1. **Always plan before acting** - Use `@planning` or create a todo list
2. **Use targeted searches** - Prefer grep/glob over broad exploration
3. **Summarize large contexts** - Keep files under 200 lines when possible
4. **Model selection**:
   - Flash/Pro Flash: Routine tasks, simple queries
   - Pro: Planning, complex architecture, code review
5. **Avoid repetition** - Reference existing patterns via skills/rules
6. **Lean responses** - 1-3 sentences for simple questions

---

## Project Structure

```
ClickFlash/
├── apps/master/        # Electron + React 19 (Port 8090)
├── apps/touch/         # Electron + React 19 (Port 8091)
├── apps/moneytrash/    # Next.js 16 + Tauri (Port 3000)
├── apps/management/    # React + Vite (Cloudflare Pages)
├── apps/gallery/       # React + Stripe (Cloudflare Pages)
├── apps/cloud-backend/ # Cloudflare Worker (D1 + R2 + Stripe)
├── apps/website/       # Next.js 15 + Tailwind 4 (Vercel/CF Pages)
├── packages/           # Shared packages
```

---

## Development Commands

```bash
npm run dev:master        # Master Portal
npm run dev:touch         # Touch Kiosk
npm run build:master      # Build + package
npm run lint:all          # Lint all apps
npm run test:all          # Run all tests
npm run deploy            # Deploy Cloudflare Worker (in apps/cloud-backend)
```

---

## Path Aliases

All apps use `@/` aliases: `@/components/*`, `@/services/*`, `@/hooks/*`, `@/utils/*`, `@/types/*`

---

## Coding Standards

| Type | Convention |
|------------------------------|------------------|
| Components | PascalCase (`AlbumEditor.tsx`) |
| Hooks/Utils | camelCase (`useAlbums.ts`) |
| Constants | UPPER_SNAKE_CASE |
| Types | PascalCase |

**Import Order**: React → Internal (@/) → Relative → Type-only

**Component Template**:
```typescript
import React, { memo, useCallback } from 'react';

interface Props { title: string; onClick: () => void; }

export const Component: React.FC<Props> = memo(({ title, onClick }) => {
    const handle = useCallback(() => onClick(), [onClick]);
    return <div onClick={handle}>{title}</div>;
});

Component.displayName = 'Component';
```

**State Management**:
- Server: React Query (`useQuery`, `useMutation`)
- Client: `useState`/`useReducer`

**Styling**: Tailwind CSS with dark mode (`dark:bg-*`)

**Logging**: Use `logger` from `@/utils/logger`, NOT console.log

---

## Security Checklist

- [ ] Zod validation for input
- [ ] Rate limiting on public endpoints
- [ ] CSRF tokens for state-changing ops
- [ ] XSS sanitization
- [ ] Parameterized queries (SQL injection)
- [ ] Auth checks on protected routes

---

## Available Skills

Installed workspace skills in `.agents/skills/`:
- `@frontend-developer` - Frontend best practices
- `@react-best-practices` - React patterns
- `@code-reviewer` - Quality code reviews
- `@debugger` - Systematic debugging
- `@planning` - Structured planning
- `@git-workflow` - Git workflows

Global skills: `~/.gemini/antigravity/skills/` (1400+ skills)

---

## Pre-Commit Checklist

- [ ] Lint passes
- [ ] Type checking passes
- [ ] Tests pass
- [ ] `memo` components have `displayName`
- [ ] Logger used (not console.log)
- [ ] Absolute imports (@/)
- [ ] Types defined for all props

---

## Context Management

- **Skills**: Load on-demand for specific tasks
- **Memory**: Use `@memory` skill for long-running context
- **Summarization**: Summarize after 10+ tool uses
- **Session hygiene**: Keep context lean, reference rules

---

**Version:** 4.3.0  
**Last Updated:** July 2026
---
name: repository-agent
description: Agent operating guide for claude-code.
---

# Agent

## Purpose
Define how an automated coding agent should operate in this repository.

## Core Rules
- Keep changes small, targeted, and easy to review.
- Preserve existing command behavior unless a task explicitly asks for a behavior change.
- Favor existing patterns in `src/commands/`, `src/tools/`, and shared utility modules.
- Avoid broad refactors while fixing localized issues.

## Workflow
1. Gather context from relevant files before editing.
2. Implement the smallest viable change.
3. Run focused validation (type checks/tests for changed areas).
4. Summarize what changed and any remaining risks.

## Code Style
- Match existing TypeScript style and naming in nearby files.
- Prefer explicit, readable logic over compact clever code.
- Add brief comments only when logic is not obvious.

## Validation
- Prefer targeted checks first, then broader checks if needed.
- If validation cannot run, clearly state what was skipped and why.

## Notes
- Repository conventions may evolve; update this file when team norms change.
