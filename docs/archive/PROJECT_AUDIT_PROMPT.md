# Full Project Audit Prompt

## Context

You are auditing the **ClickFlash** photography platform - a multi-app system consisting of:

- **Master Portal** (`apps/master/`) - Photo management dashboard (port 8090)
- **Touch Kiosk** (`apps/touch/`) - Customer-facing kiosk interface (port 8091)
- **Mobile App** (`apps/mobile/`) - Expo-based React Native app
- **Management Hub** (`apps/management/`) - Admin interface
- **Gallery** (`apps/gallery/`) - Customer photo gallery
- **MoneyTrash** (`apps/moneytrash/`) - Uploader tool

Tech Stack:

- Frontend: React + TypeScript + Vite + Tailwind CSS
- Mobile: Expo + React Native
- Backend: REST API with WebSocket support
- State Management: React Query (TanStack Query)
- UI Components: Custom + shared packages
- Build Tools: npm workspaces, various build scripts

---

## Audit Instructions

Perform a comprehensive audit of the entire codebase. Analyze **all** files in the project and provide a detailed report covering the following areas:

---

## 1. CODE QUALITY & STANDARDS

### 1.1 TypeScript Practices

- [ ] Check for proper type definitions across all components and functions
- [ ] Identify any `any` types that should be more specific
- [ ] Review interface naming conventions and consistency
- [ ] Check for proper use of generics
- [ ] Identify missing return type annotations on functions
- [ ] Review type guards and type assertions for correctness

### 1.2 React Best Practices

- [ ] Verify proper use of hooks (rules of hooks compliance)
- [ ] Check for missing dependency arrays in `useEffect`, `useMemo`, `useCallback`
- [ ] Review component composition patterns
- [ ] Identify components that should be memoized (`React.memo`)
- [ ] Check for proper key usage in lists
- [ ] Review prop drilling vs context usage
- [ ] Identify potential for custom hooks extraction

### 1.3 Code Organization

- [ ] Review file structure and organization per app
- [ ] Check for code duplication across apps/packages
- [ ] Identify opportunities for shared utilities/components
- [ ] Review barrel exports (index.ts files)
- [ ] Check for proper separation of concerns

---

## 2. ARCHITECTURE & DESIGN PATTERNS

### 2.1 State Management

- [ ] Review React Query usage patterns
  - Proper query keys structure
  - Cache configuration (staleTime, gcTime)
  - Optimistic updates implementation
  - Error handling strategies
- [ ] Check for proper query invalidation patterns
- [ ] Review mutation error handling
- [ ] Identify state that should be local vs global

### 2.2 Component Architecture

- [ ] Review component hierarchy and nesting depth
- [ ] Check for proper component composition
- [ ] Identify overly complex components (consider refactoring)
- [ ] Review presentational vs container component separation
- [ ] Check for proper use of compound components pattern

### 2.3 API Integration

- [ ] Review API service layer organization
- [ ] Check for consistent error handling in API calls
- [ ] Review request/response type definitions
- [ ] Identify retry logic and timeout configurations
- [ ] Check for proper cancellation of requests

---

## 3. PERFORMANCE ANALYSIS

### 3.1 Rendering Performance

- [ ] Identify unnecessary re-renders
- [ ] Review `useMemo` and `useCallback` usage for effectiveness
- [ ] Check for expensive computations in render phase
- [ ] Review list virtualization for large datasets
- [ ] Identify components that could benefit from code splitting

### 3.2 Bundle Size

- [ ] Analyze import patterns (tree-shaking potential)
- [ ] Identify large dependencies that could be replaced
- [ ] Check for duplicated dependencies across apps
- [ ] Review dynamic import usage

### 3.3 Memory Management

- [ ] Check for potential memory leaks in subscriptions
- [ ] Review cleanup in `useEffect` return functions
- [ ] Identify unclosed WebSocket connections
- [ ] Check for event listener cleanup

---

## 4. SECURITY AUDIT

### 4.1 Authentication & Authorization

- [ ] Review token storage and handling
- [ ] Check for proper session management
- [ ] Review protected route implementations
- [ ] Check for role-based access control (RBAC) implementation
- [ ] Identify potential authentication bypass vulnerabilities

### 4.2 Input Validation

- [ ] Review form validation patterns
- [ ] Check for XSS prevention measures
- [ ] Review sanitization of user inputs
- [ ] Check file upload validation and restrictions

### 4.3 Data Protection

- [ ] Review sensitive data handling in frontend
- [ ] Check for hardcoded secrets or API keys
- [ ] Review environment variable usage
- [ ] Check CORS configuration if applicable

### 4.4 Dependencies Security

- [ ] Identify outdated dependencies
- [ ] Check for known vulnerabilities in dependencies (`npm audit`)
- [ ] Review use of deprecated packages

---

## 5. ERROR HANDLING & RESILIENCE

### 5.1 Error Boundaries

- [ ] Check for React Error Boundary implementation
- [ ] Review error fallback UI components
- [ ] Identify components missing error boundary protection

### 5.2 Async Error Handling

- [ ] Review try-catch patterns in async functions
- [ ] Check for unhandled promise rejections
- [ ] Review error logging implementation
- [ ] Check user-facing error messages (not too technical)

### 5.3 Loading States

- [ ] Review loading state management
- [ ] Check for skeleton screens or loading indicators
- [ ] Review suspense usage where applicable

---

## 6. TESTING COVERAGE

### 6.1 Unit Tests

- [ ] Identify files without corresponding test files
- [ ] Review test quality and assertions
- [ ] Check for proper mocking of dependencies
- [ ] Review test organization and naming

### 6.2 Integration/E2E Tests

- [ ] Check E2E test coverage for critical user flows
- [ ] Review test data setup and teardown
- [ ] Identify flaky tests

### 6.3 Test Infrastructure

- [ ] Review test configuration files
- [ ] Check for proper test utilities and helpers
- [ ] Review CI/CD integration for tests

---

## 7. ACCESSIBILITY (a11y)

### 7.1 Semantic HTML

- [ ] Review proper heading hierarchy (h1-h6)
- [ ] Check for semantic HTML elements (nav, main, article, etc.)
- [ ] Review form label associations

### 7.2 ARIA

- [ ] Check for proper ARIA labels and roles
- [ ] Review focus management in modals/dropdowns
- [ ] Check for skip links
- [ ] Review keyboard navigation support

### 7.3 Visual Accessibility

- [ ] Check color contrast ratios
- [ ] Review focus indicators
- [ ] Check for text resizing support

---

## 8. STYLING & UI CONSISTENCY

### 8.1 Tailwind CSS Usage

- [ ] Review for arbitrary value overuse (e.g., `[100px]`)
- [ ] Check for consistent spacing/sizing scale usage
- [ ] Review responsive design patterns
- [ ] Check for dark mode implementation completeness

### 8.2 UI Component Consistency

- [ ] Review button variants and usage
- [ ] Check form input styling consistency
- [ ] Review modal/dialog patterns
- [ ] Check for consistent loading/error states UI

### 8.3 Mobile Responsiveness

- [ ] Review mobile-first CSS approach
- [ ] Check touch target sizes
- [ ] Review responsive breakpoints consistency

---

## 9. CONFIGURATION & INFRASTRUCTURE

### 9.1 Build Configuration

- [ ] Review Vite configurations per app
- [ ] Check TypeScript configurations
- [ ] Review build output optimization
- [ ] Check for proper source map configuration

### 9.2 Package Management

- [ ] Review dependency versions consistency across apps
- [ ] Check for unused dependencies
- [ ] Review peer dependencies configuration
- [ ] Check lock file integrity

### 9.3 Environment Configuration

- [ ] Review .env.example completeness
- [ ] Check environment variable validation
- [ ] Review configuration for different environments

---

## 10. DOCUMENTATION

### 10.1 Code Documentation

- [ ] Review JSDoc comments on public APIs
- [ ] Check complex function documentation
- [ ] Review README files in each app/package

### 10.2 Type Documentation

- [ ] Check for exported type documentation
- [ ] Review complex type definitions explanation

---

## 11. SPECIFIC AREAS OF CONCERN

Based on project history, pay special attention to:

### 11.1 Album Editor

- [ ] Photo management logic
- [ ] Drag-and-drop functionality
- [ ] State synchronization

### 11.2 Kiosk Category System

- [ ] Category assignment logic
- [ ] Display state management

### 11.3 MoneyTrash Mechanism

- [ ] Upload queue management
- [ ] Background processing

### 11.4 Master Portal Pages

- [ ] Dashboard analytics
- [ ] Settings management
- [ ] User management flows

---

## OUTPUT FORMAT

Provide the audit report in the following structure:

```markdown
# Project Audit Report - ClickFlash

## Executive Summary
- Overall health score (1-10)
- Top 5 critical issues
- Top 5 recommendations

## Detailed Findings

### 1. Code Quality & Standards
#### Critical Issues
- [Issue description] | [File path] | [Priority: P0/P1/P2]

#### Warnings
- [Issue description] | [File path] | [Priority]

#### Recommendations
- [Recommendation] | [Rationale]

[Repeat for all sections...]

## Action Plan

### Immediate Actions (P0 - This Week)
1. [Action item]

### Short-term (P1 - Next 2 Weeks)
1. [Action item]

### Long-term (P2 - Next Month)
1. [Action item]

## Statistics
- Total files analyzed: X
- Total issues found: X (P0: X, P1: X, P2: X)
- Test coverage: X%
- Dependencies: X (outdated: X, vulnerable: X)
```

---

## AUDIT CHECKLIST

Before starting, ensure:

- [ ] All apps can build successfully
- [ ] All tests pass (or document which don't)
- [ ] You have access to all source files
- [ ] You can run the applications locally

---

*This audit prompt should be used with an AI assistant or senior developer to perform a comprehensive review of the ClickFlash codebase.*
