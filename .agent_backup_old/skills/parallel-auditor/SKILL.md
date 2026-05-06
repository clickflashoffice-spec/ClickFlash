---
name: parallel-auditor
description: Simulates critical feedback from Security, Style, and Performance sub-agents for complex tasks.
---

# Parallel Auditor

**Trigger**: Refactoring or fixing complex bugs (>50 LOC or critical paths).
**Goal**: Identify risks before execution by "fanning out" to specialized personas.

## Instructions

1. **Analyze the Proposed Change**: Look at the plan or code diff.
2. **Simulate Three Personas**:
    * **🛡️ Security Auditor**: Scan for SQLi, XSS, unvalidated inputs, permission bypasses, and secret leaks.
    * **🎨 Style Enforcer**: Check for consistency with project patterns (e.g., "Effective C++", "Rust Idioms", "Clean Code"), strict typing, and separation of concerns.
    * **⚡ Performance Analyst**: Check for O(n^2) loops, blocking main thread, unnecessary clones/copies, and N+1 queries.
3. **Synthesize Feedback**:
    * Present the findings in a unified table or list.
    * **Verdict**: [PROCEED] | [BLOCK]
    * If blocked, mandate specific changes before writing code.

## Example Output

> **Parallel Audit Report**
>
> * **Security**: ⚠️ Param parsing is loose. Add validation.
> * **Style**: ✅ Conforms to patterns.
> * **Performance**: ❌ `clone()` in hot loop detected.
> **Verdict**: BLOCK. Fix cloning issue first.
