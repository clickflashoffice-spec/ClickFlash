# Python Standards

## 1. Type Safety

* **Type Hints**: Mandatory for function signatures.
* **Mypy**: Code must pass strict mypy analysis.

## 2. Code Style

* **Google Style**: Use Docstrings (`"""Args: ... Returns: ..."""`).
* **Formatter**: Use `black` or `ruff`.

## 3. Architecture

* **Virtual Env**: Never install to global pip. Use `.venv`.
* **Pydantic**: Use Pydantic models for data validation instead of raw dicts.
* **AsyncIO**: Use `async`/`await` for I/O bound operations (DB, Network).
