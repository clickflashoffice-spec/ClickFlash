# Startup Mandatory Protocol

> [!IMPORTANT]
> **Rule 00**: Automatic Context Loading

## Protocol

Upon session initialization (or the first prompt of a new chat), the agent **MUST** immediately "deep dive" into the project context.

### Required Actions

1. **Execute Startup Workflow**: Run the `daily_startup` workflow if available.
   - Command: `/daily_startup` or equivalent tool usage.

2. **Alternative (Manual Load)**: If workflow cannot be run, manually read:
   - `E:\ClickFlash\.agent\task.md`
   - `E:\ClickFlash\.agent\implementation_plan.md`
   - `E:\ClickFlash\.agent\scratchpad.log`
   - `E:\ClickFlash\.agent\walkthrough.md`

### Verification

Do not proceed with complex user requests until you have confirmed the current state from these artifacts.
