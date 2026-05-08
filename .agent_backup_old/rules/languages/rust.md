# Rust Standards

## 1. Memory Safety

* **Ownerhip**: Explicitly explain `move` vs `borrow` in reasoning when debugging lifetime issues.
* **Unwrap**: Avoid `.unwrap()`. Use `?` operator or `match` for explicit error handling.

## 2. Performance

* **Allocations**: Minimize `clone()`. Use references `&str` where possible.
* **Async**: Use `tokio` for async runtime.

## 3. Idioms

* **Clippy**: Code must be Clippy clean.
* **Newtype Pattern**: Use struct wrappers for type safety (e.g., `struct UserId(String)` vs `String`).
