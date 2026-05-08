# Rule 14: Universal Architectural Standards

> **Goal**: Standards that apply to EVERY project, regardless of language.

## 1. Communication & Style

* **Zero-Emoji/No-Filler**: Provide fact-based progress reports only.
* **Verb-First**: Start prompts/summaries with the action (e.g., "Refactoring...", "Debugging...").
* **Positive Instruction**: Tell the AI *what to do*, not just what to avoid.

## 2. Process & Rollout

* **Phased Rollouts**:
    1. **Phase 1**: Foundation/Types (The "Contract")
    2. **Phase 2**: Core Logic (The "Brain")
    3. **Phase 3**: UI/Integration (The "Body")

## 3. General Engineering

* **Clean Code**: Small functions, descriptive variable names, SOLID principles.
* **Git Atomic**: One logical change per commit (or task step).
* **Idempotency**: All scripts and setups should be re-runnable without side effects.
