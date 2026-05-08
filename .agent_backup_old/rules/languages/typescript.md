# TypeScript & React Standards

## 1. Safety & Types

* **Strict Mode**: `strict: true` in `tsconfig.json`.
* **No Explicit Any**: Use `unknown` or define a proper interface.
* **Zod**: Use Zod for runtime validation of external data (APIs, generic inputs).

## 2. React Patterns

* **Functional Components**: Use FCs with Hooks. No Class components.
* **Data Fetching**:
  * **Server Components**: Preferred for initial data load (Next.js 13+).
  * **React Query**: Preferred for client-side fetching/caching.
  * **Anti-Pattern**: Avoid `useEffect` for data fetching (prevents waterfalls).

## 3. UI/UX

* **Tailwind**: Use utility classes. Keep markup clean by extracting common patterns to components or `@layer components`.
* **Accessibility**: All interactive elements need `aria-label` if text is not visible.
