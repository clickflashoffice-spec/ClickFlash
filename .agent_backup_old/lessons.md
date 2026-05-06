# ClickFlash Lessons Learned & Patterns

This document tracks technical patterns, user corrections, and architectural decisions to prevent error recurrence and maintain high engineering standards.

## 1. Dependency Resolution & Execution Patterns

- **ISSUE**: `npx` or `pnpm dlx` failing on local scripts due to missing dependencies or incorrect context isolation.
- **ROOT CAUSE**: Scripts often rely on siblings' `node_modules` or environment-specific globals that are not captured by ephemeral `npx` runs.
- **LESSON**: When running local utility scripts (e.g., stress tests), prefer direct `node` execution using `NODE_PATH` pointing to an existing stable `node_modules` (like `apps/master/node_modules`) or install directly into the workspace root.
- **PREVENTION**: Use zero-dependency node scripts (native `fetch`, `crypto`, `fs`) whenever possible to maximize portability and minimize toolchain friction.

## 2. Artifact Rendering Standards

- **ISSUE**: Broken image links or relative path errors in `.agent` walkthroughs.
- **ROOT CAUSE**: The artifact viewer requires absolute paths starting with `/` for images, but they must be located within the artifact directory for proper context.
- **PREVENTION**: Always copy media files to the brain artifact directory before embedding, and use the format `![alt text](/absolute/path/to/media.png)`.

## 3. Cloud Native Transition (Cloudflare Workers)

- **PATTERN**: When moving from Express/SQLite to Cloudflare Workers/D1, ensure all service layers are updated from "Local Disk" assumptions to "State-less/D1-Binding" patterns in all documentation.
- **ALIGNMENT**: Documentation must explicitly state that `apps/management` and `apps/gallery` are Workers, while `apps/master` remains an Electron bridge.
