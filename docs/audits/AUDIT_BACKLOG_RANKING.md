# Audit Backlog Ranking

This document ranks the vulnerabilities found in the ecosystem by severity, impact, and dependency depth.

| Rank | Package | Severity | Title | Occurrences | Min Depth |
|---|---|---|---|---|---|
| 1 | `image-size` | **HIGH** | image-size: ICNS parser allows denial of service through an infinite loop | 2 | 4 |
| 2 | `image-size` | **HIGH** | image-size: JXL and HEIF parsers allow denial of service through infinite loops | 2 | 4 |
| 3 | `js-yaml` | **HIGH** | JS-YAML: Quadratic CPU consumption in !!omap resolution (3.x and 4.x) ΓÇö CVE-2026-59870 fix not backported | 1 | 5 |
| 4 | `js-yaml` | **HIGH** | JS-YAML: Quadratic CPU consumption in !!omap resolution (3.x and 4.x) ΓÇö CVE-2026-59870 fix not backported | 1 | 7 |
| 5 | `nanoid` | **HIGH** | nanoid: non-secure generators can loop indefinitely with negative size | 1 | 7 |
| 6 | `nanoid` | **HIGH** | nanoid: custom generators can loop indefinitely when size is zero | 1 | 7 |
| 7 | `uuid` | **MODERATE** | uuid: Missing buffer bounds check in v3/v5/v6 when buf is provided | 6 | 2 |
| 8 | `esbuild` | **MODERATE** | esbuild enables any website to send any requests to the development server and read the response | 2 | 3 |
| 9 | `react-router-dom` | **MODERATE** | React Router: Open redirect leading to XSS | 1 | 2 |
| 10 | `dompurify` | **MODERATE** | DOMPurify: IN_PLACE hook removal leaves a detached subtree executable, causing XSS | 1 | 2 |
| 11 | `zod` | **MODERATE** | Zod denial of service vulnerability | 1 | 3 |
| 12 | `ajv` | **MODERATE** | ajv has ReDoS when using `$data` option | 1 | 3 |
| 13 | `qs` | **MODERATE** | qs has a remotely triggerable DoS: qs.stringify crashes with TypeError on null/undefined entries in comma-format arrays when encodeValuesOnly is set | 1 | 3 |
| 14 | `joi` | **MODERATE** | joi has an uncaught RangeError on deeply nested input through recursive `link()` schemas | 1 | 3 |
| 15 | `webpack-dev-server` | **MODERATE** | webpack-dev-server vulnerable to cross-site request forgery via internal developer endpoints | 1 | 3 |
| 16 | `webpack-dev-server` | **MODERATE** | webpack-dev-server vulnerable to denial of service via a malformed Host or Origin header | 1 | 3 |
| 17 | `@hono/node-server` | **MODERATE** | Node.js Adapter for Hono: Path traversal in `serve-static` on Windows via encoded backslash (`%5C`) | 1 | 3 |
| 18 | `react-router` | **MODERATE** | React Router: Open redirect via backslash in <Link> and useNavigate (CVE-2025-68470 bypass) | 1 | 3 |
| 19 | `react-router` | **MODERATE** | React Router: Arbitrary Constructor Injection via deserializeErrors() in React Router SSR Hydration | 1 | 3 |
| 20 | `@remix-run/router` | **MODERATE** | React Router's same-origin redirect with path starting // causes open redirect via protocol-relative URL reinterpretation | 1 | 3 |
| 21 | `react-router` | **MODERATE** | React Router's same-origin redirect with path starting // causes open redirect via protocol-relative URL reinterpretation | 1 | 3 |
| 22 | `fast-xml-parser` | **MODERATE** | Entity Expansion Limits Bypassed When Set to Zero Due to JavaScript Falsy Evaluation in fast-xml-parser | 1 | 5 |
| 23 | `fast-xml-parser` | **MODERATE** | fast-xml-parser XMLBuilder: XML Comment and CDATA Injection via Unescaped Delimiters | 1 | 5 |
| 24 | `serialize-javascript` | **MODERATE** | Serialize JavaScript has CPU Exhaustion Denial of Service via crafted array-like objects | 1 | 5 |
| 25 | `undici` | **MODERATE** | undici vulnerable to downstream response desynchronization via retry interceptor | 1 | 6 |
| 26 | `undici` | **MODERATE** | undici vulnerable to CRLF Injection via blob-like body 'type' property | 1 | 6 |
| 27 | `undici` | **MODERATE** | undici vulnerable to cookie attribute injection via unsanitized domain and unparsed setCookie fields | 1 | 6 |
| 28 | `yaml` | **MODERATE** | yaml is vulnerable to Stack Overflow via deeply nested YAML collections | 1 | 9 |
| 29 | `esbuild` | **LOW** | esbuild allows arbitrary file read when running the development server on Windows | 1 | 2 |
| 30 | `body-parser` | **LOW** | body-parser vulnerable to denial of service when invalid limit value silently disables size enforcement | 1 | 2 |
| 31 | `dompurify` | **LOW** | DOMPurify: `CUSTOM_ELEMENT_HANDLING` bypasses `afterSanitizeElements` for allowed custom elements. | 1 | 2 |
| 32 | `cookie` | **LOW** | cookie accepts cookie name, path, and domain with out of bounds characters | 1 | 3 |
| 33 | `@tootallnate/once` | **LOW** | @tootallnate/once vulnerable to Incorrect Control Flow Scoping | 1 | 5 |
| 34 | `body-parser` | **LOW** | body-parser vulnerable to denial of service when invalid limit value silently disables size enforcement | 1 | 5 |
| 35 | `@babel/core` | **LOW** | @babel/core: Arbitrary File Read via sourceMappingURL Comment | 1 | 7 |
