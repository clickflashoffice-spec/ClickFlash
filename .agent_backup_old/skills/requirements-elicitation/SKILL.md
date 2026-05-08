---
name: requirements-elicitation
description: Enforces the Spec-First rule. Use this skill when the user requests a new feature (>2 files) or complex architecture change.
---
# Requirements Elicitation (Spec-First)

**Trigger**: Users requests a new feature or complex refactor involving more than 2 files.
**Goal**: Create a comprehensive `spec.md` before writing any code.

## 1. Plan Phase (No Code Yet)

Do not write implementation code. Instead, initiate a planning dialogue.

* **Ask Clarifying Questions**: Identify ambiguity in the user's request.
* **Define Architecture**: deciding on patterns, data structures, and file interactions.
* **Identify Edge Cases**: What happens when offline? What about large files?

## 2. Create Specification Artifact

Create or update a file named `spec.md` (or valid equivalent like `implementation_plan.md`) with:

```markdown
# [Feature Name] Specification

## Architecture Decisions
- [Decision 1]
- [Decision 2]

## Data Models
- Schema changes
- Type definitions

## Security & Performance
- Offline constraints
- Validation rules
```

## 3. User Approval

Explicitly ask: "Does this specification match your requirements? Type 'Approved' to proceed to execution."

**STOP**: Do not proceed to coding until approval is received.
