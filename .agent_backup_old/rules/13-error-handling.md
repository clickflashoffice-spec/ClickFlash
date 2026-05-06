# Rule 13: Error Handling & Circuit Breakers

> **Goal**: Prevent "doom loops" and enforce rigorous root cause analysis.

## 1. The "Serial Chasing" Circuit Breaker

**Failure Analysis**: If a fix fails twice, **STOP**.
**Action**: Perform a System Audit to see if the error is a symptom of a larger architectural flaw (e.g., race conditions, incorrect state management) rather than a local bug.

## 2. Mandatory RCA

**Rule**: Every fix must be preceded by a single-sentence Root Cause Analysis.
**Constraint**: Do not provide code until the underlying "why" is identified.

## 3. Verification Loop

**Action**: Use built-in browser or terminal tools to validate behavior end-to-end after a fix.
**Confirmation**: Explicitly state: "Tests passed in browser/terminal. Confirm closure?"
