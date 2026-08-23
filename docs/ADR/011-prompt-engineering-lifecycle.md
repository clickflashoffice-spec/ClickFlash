# ADR-011: Enterprise Prompt Engineering Lifecycle & Guardrails

## Status
Accepted

## Context
As ClickFlash expands its autonomous AI capabilities across auto-culling, sales negotiation, dynamic yield pricing, smart album storytelling, and biometric anti-spoofing, ad-hoc string concatenation prompts create severe reliability, security, and cost risks (e.g. prompt injection, hallucinated discount codes, format parsing failures, unbudgeted token consumption).

## Decision
All AI interactions across the ClickFlash platform must adhere to the standardized Prompt Engineering Lifecycle implemented in `@clickflash/ai`:

1. **Strict JSON Schema Enforcement**:
   - Every system prompt requiring structured output must define and validate responses against explicit Zod schemas (`schemas.ts`).
2. **Standardized Prompt Catalog (`PromptCatalog`)**:
   - Centralized prompt definitions and templates reside in `@clickflash/ai` (`prompts.ts`) with clear category separation (Vision & Ingestion, Swarm Commerce, Guest Interaction, Engineering QA).
3. **Deterministic Variable Interpolation**:
   - Prompts with dynamic variables use `formatPrompt(template, variables)` with regex-based `{{VAR_NAME}}` substitution and strict missing-variable warnings.
4. **Few-Shot Calibration**:
   - Prompts handling ambiguous tasks (e.g. subtle blur grading, conversational counter-offers) incorporate few-shot input/output examples to constrain model variance.
5. **Quality Gates & Budget Enforcement (`guardrails.ts`)**:
   - Every outbound prompt and inbound completion passes through brand safety checks, hallucination risk evaluation, and per-day token budget caps.

## Consequences
- **Positive**:
  - Predictable, type-safe LLM outputs across all 12 monorepo apps.
  - Zero risk of unconstrained price negotiation or prompt injection leaks.
  - Token expenditure tracking and budget compliance.
- **Negative**:
  - Minor development overhead when adding new AI features (defining schema + prompt + tests).
