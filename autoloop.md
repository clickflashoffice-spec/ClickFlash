# Autonomous Loop Protocol (`autoloop`)

This file governs the behavior of AI agents operating in an autonomous loop (ReAct loop) within the ClickFlash monorepo.

## Goal & Target Constraints
- **Primary Directive**: Read `task.md` for the current goal. 
- **Scope**: Restrict file modifications strictly to the `apps/*` or `packages/*` defined in the task. Do not make sweeping cross-monorepo changes unless explicitly instructed.

## Evaluation (Eval) Commands
Agents MUST verify their work after code modifications by running the following evaluations.

1. **Primary Verification** (Run this first for rapid feedback):
   ```bash
   npm run typecheck:all && npm run lint:all
   ```
2. **Secondary Verification** (Run after passing types and linting):
   ```bash
   npm run test:all
   ```

*Note: You may run `npm run test:ecosystem` if the task involves cross-app integration (e.g., Touch communicating with Master).*

## Guardrails & Iteration Constraints
1. **Self-Correction**: If the eval commands fail, analyze the output, adjust the code, and try again.
2. **Iteration Limit**: Do NOT exceed **5 autonomous iterations** of (Edit -> Eval -> Fail). If a bug persists after 5 attempts, pause the loop and report back to the user with the findings.
3. **Commit Logic**: Only stage/commit changes if all evaluation commands pass successfully. Revert dirty changes if they lead to an unresolvable state.
