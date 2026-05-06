# Deep Scan Audit Specification

**Status**: PROPOSED
**Prompt**: "Deep-Dive Audit" (Restart)
**Role**: Lead Software Engineer / System Architect

## 1. Objective

Perform a 360-degree code audit to identify logic flaws, security vulnerabilities, code duplication, and scalability bottlenecks. Produce a "Health Report" and a "Optimization Roadmap".

## 2. Scope & Target Areas

### Core Applications

- **Master App (React)**: `e:\ClickFlash\master-app\react-new` (Modern Stack)
- **Master App (Python)**: `e:\ClickFlash\master-app\python` (Legacy Backend)
- **Touch App**: `e:\ClickFlash\touch-app` (Frontend & Kiosk Logic)
- **Shared Libraries**: `e:\ClickFlash\common`, `e:\ClickFlash\shared`

### Exclusions

- `node_modules`
- `venv` / `.venv`
- `dist` / `build`
- `pb_data` (Database files)
- `tests` (Unless auditing test coverage itself)

## 3. Audit Methodology

### Phase 1: Structural Integrity (The "Skeleton")

- **Dependency Mapping**: Visualize imports between `react`, `python`, and `cpp`.
- **File System Hygiene**: Identify "Dead Files" (not imported anywhere) and "Ghost Configs".
- **Rule Adherence**: Check compliance with Operational Laws (e.g., Law 01 Dual-Scope, Law 06 Touch Local Fetch).

### Phase 2: Logic & Bug Detection (The "Brain")

- **Concurrency & Races**: Scan `async/await` patterns in TS and `threading` in Python. Look for missing locks or `await`.
- **Error Handling**: Search for empty `catch` blocks or `except Exception: pass`.
- **State Management**: Audit React Context and Redux/Zustand usage for unnecessary re-renders.

### Phase 3: Security Hardening (The "Shield")

- **Secrets Scan**: Regex search for api keys, passwords, generic tokens.
- **Input Validation**: Check API endpoints (`express` routes, `flask` routes) for schema validation (Zod/Pydantic).
- **Filesystem Access**: Audit `fs.readFile` / `open()` calls for directory traversal vulnerabilities.

### Phase 4: Scalability & Performance (The "Muscle")

- **Complexity Analysis**: Identify functions > 50 LOC or with high Cyclomatic Complexity.
- **Data Structures**: Check for $O(n^2)$ lookups (nested loops over arrays vs Maps).
- **Import Performance**: Analyze 'lazy loading' vs 'eager loading' in React.

## 4. Execution Plan (Timeline)

1. **Reconnaissance**: Map file trees and update exclusions.
2. **Automated Scanning**: Run `grep_search` and `find_by_name` for patterns.
3. **Manual Review**: Deep read of critical files (e.g., `PhotoProcessor.ts`, `ingest.py`).
4. **Reporting**: Compile `DEEP_SCAN_REPORT.md` with:
    - Critical Fixes (Priority 0)
    - Refactoring Opportunities (Priority 1)
    - Architecture Roadmap (Priority 2)

## 5. Verification

- Each "Fix" proposed will be accompanied by a "Verification Step" (Test or Manual Check).
