# Rule 12: Autonomous Agent Governance

> **Goal**: Establish clear protocols for agent autonomy, planning, and validation.

## 1. Verb-First Mandate

If an input is only a code block, do not guess intent. Immediately ask:
> "Specify Agent Action: [Debug | Refactor | Explain | Extend | Plan]?"

## 2. Plan-Before-Code (Planning Mode)

**Trigger**: Any request involving >2 files or cross-layer logic (e.g., Rust to WASM).
**Action**:

1. Execute **Phase 0: Auto-Brainstorming** (per [11-expert-mode.md](file:///e:/ClickFlash/.agent/rules/11-expert-mode.md)) to refine requirements.
2. Generate a **Plan Artifact** (`implementation_plan.md` or `spec.md`).
**Constraint**: User must approve the plan before execution of terminal commands or code edits.

## 3. Multi-Agent Validation

**Trigger**: Debugging complex Rust ownership, async issues, or critical refactors.
**Action**: Spawn a "Reviewer" sub-agent (or use the `parallel-auditor` skill) to critique the primary agent’s proposed fix before presenting it.

## 4. Screenshot Archival Mandate

**Trigger**: User uploads any screenshot in the chat.
**Action**: Immediately save the screenshot to `e:/ClickFlash/.agent/images/` with a descriptive name.
**Action**: Reference the saved image in `task.md` or a relevant documentation file.

## 5. Auto-Skill Activation

**Trigger**: Every new user request or major task boundary.
**Action**:

1. Scan available skills in `skills_index.json` or `.agent/skills/`.
2. Determine if any skill matches the current context.
3. Activate the skill by reading its `SKILL.md` file using `view_file`.
4. Follow the skill's instructions explicitly.
