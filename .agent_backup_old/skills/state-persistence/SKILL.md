---
name: state-persistence
description: Ensures continuity between sessions by saving state to a log file.
---

# State Persistence (Middle Loop)

**Trigger**: End of every "burst" session (approx every 10-15 steps) or before stopping.
**Goal**: Allow the next agent (or you in the future) to resume exactly where you left off.

## Instructions

1. **Locate Log**: Use `scratchpad.log` (create if missing).
2. **Append Update**:
    * **Timestamp**: Current time.
    * **Progress**: Bullet points of what worked.
    * **Blockers**: Specific errors or open questions.
    * **NEXT STEPS**: A precise command or action for the next run.

## Template

```text
[YYYY-MM-DD HH:MM] SESSION UPDATE
----------------------------------------
✅ DONE:
- Built core inputs
- Verified database schema

🚧 BLOCKERS:
- Error in 'user_auth' linking (Output: "...symbol not found...")

👉 NEXT ACTIONS:
1. Run `grep_search "user_auth"` to find definition.
2. Fix import path in `main.rs`.
```
