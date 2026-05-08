# Rule 15: Dynamic Context Loading

> **Goal**: Automatically adapt to the technology stack of the current task.

## Trigger

**Start of every Task** or when switching projects (e.g., from `ClientApp` to `ServerAPI`).

## Action

1. **Scan Context**: Look at the file extensions in `active_files` or the current directory.
2. **Load Language Pack**: Explicitly read the matching rule file from `.agent/rules/languages/`.
    * `.ts`/`.tsx` -> Read `languages/typescript.md`
    * `.py` -> Read `languages/python.md`
    * `.rs` -> Read `languages/rust.md`
    * `.cpp`/`.h` -> Read `languages/cpp.md`
3. **Acknowledge**: In your first thought/plan, state: *"Context identified: [Lang]. Standards loaded."*

## Failure Mode

If no specific language rule exists, rely solely on `14-universal-standards.md`.
