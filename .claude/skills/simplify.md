---
name: simplify
description: Review changed code for unnecessary complexity and reduce it. Apply after implementing a feature.
triggers:
  - simplify
  - clean up
  - refactor
  - too complex
  - reduce complexity
---

# Simplify: Complexity Reduction

## Principle
The best code is code that doesn't exist. Every line is a maintenance liability.
Before abstracting, ask: does this have more than one call site? If not, inline it.

## Process

### 1. Identify hotspots
- Functions > 40 lines → split into focused helpers
- Abstractions with only one call site → inline them
- `as any` or `!` non-null assertions without a comment → fix the type
- Duplicated logic across files → check if it belongs in `packages/utils` or `packages/shared`
- Dead imports and unused variables → delete them

### 2. ClickFlash-specific reductions

**State management**
- `useState` holding server data → replace with `useQuery`
- `useEffect` + `fetch` → replace with `useQuery`
- React Context used for data that only one subtree needs → replace with props
- `memo()` without `useCallback`/`useMemo` on all props → bare `memo` is useless, remove it

**Backend**
- Express route handler > 30 lines → extract business logic to a service
- Pattern: controller = parse input → call service → return response (nothing else)
- Repeated Zod schemas → prefer `z.infer<typeof sharedSchema>` over duplicate manual interfaces

**Components**
- Component file > 200 lines → split into smaller focused components
- Props drilling > 2 levels deep → consider Zustand slice or React Query

### 3. Check shared packages first
Before extracting a new utility, check:
- `packages/utils/src/` — general utilities
- `packages/shared/src/` — business logic shared across apps
- `packages/lib/src/` — core library functions
- `packages/ui/src/` — reusable React components

### 4. Report the reduction
After simplifying: state lines before → after, functions removed, abstractions flattened.
If no reduction was possible, say why.
