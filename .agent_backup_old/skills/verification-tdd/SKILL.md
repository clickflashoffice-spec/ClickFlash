---
name: verification-tdd
description: Enforces Test-Driven Development and autonomous end-to-end verification.
---

# Verification & TDD

**Trigger**: Before marking ANY task as 'Complete'.
**Goal**: Shift responsibility of verification from User to Agent. "Never trust 'it should work'; only 'it passed tests'."

## Instructions

1. **Phase 1: Test First (TDD)**
    * Before writing implementation code, write a reproduction script, unit test, or integration test.
    * Run it to confirm failure (Red state).

2. **Phase 2: Implementation**
    * Write the code to fix the issue or add the feature.

3. **Phase 3: Autonomous Verification**
    * **Terminal**: Run the build/test command.
    * **Browser**: Use `open_browser` to verify UI changes visually if applicable. Capture a screenshot.
    * **Log**: Record the specific command run and its output.

## Success Criteria

* You must see "PASS" or equivalent success message in the terminal.
* **Do not ask the user to test.** You test.
* If testing is impossible (e.g., hardware dependency), create a "Manual Verification Checklist" artifact for the user.
