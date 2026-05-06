---
name: semantic-grounding
description: Prevents hallucinations by forcing the agent to read existing code patterns before writing new ones.
---

# Semantic Grounding (RAG-lite)

**Trigger**: Before writing new code using existing patterns or libraries.
**Goal**: Avoid "reinventing the wheel" and ensure code consistency.

## Instructions

1. **Search First**:
    * Use `grep_search` or `find_files` to look for similar functionality.
    * Example: "Searching for 'getPhotos' to see how DB queries are structured."

2. **Read & Quote**:
    * Read the relevant file (`view_file`).
    * **Mandatory**: In your plan or reasoning, explicitly QUOTE the existing function signature or type definition you are mimicking.

3. **Implement**:
    * Write your new code using the discovered patterns.
    * Reuse existing utilities rather than creating duplicates.

## Anti-Pattern

* ❌ Guessing the API of a internal utility.
* ❌ Creating a new `formatting.ts` when `utils/date_format.ts` exists.
