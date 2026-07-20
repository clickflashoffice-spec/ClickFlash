/**
 * Server-side HTML sanitizer for CMS and blog content.
 * Strips dangerous tags and attributes to prevent XSS
 * when content is rendered via dangerouslySetInnerHTML.
 *
 * This is a defense-in-depth measure — CMS content should also
 * be sanitized at ingestion time.
 */

/** Tags that are always stripped along with their content */
const DANGEROUS_TAGS = ['script', 'style', 'noscript', 'iframe', 'object', 'embed', 'applet', 'form'];

/** Attributes that execute JavaScript */
const DANGEROUS_ATTRS = /\s(on\w+|formaction|xlink:href|data-bind)\s*=/gi;

/** JavaScript and data URIs in attribute values */
const DANGEROUS_URIS = /(javascript|vbscript|data)\s*:/gi;

export function sanitizeHtml(html: string): string {
  if (!html) return '';

  let sanitized = html;

  // Strip dangerous tags and their content
  for (const tag of DANGEROUS_TAGS) {
    const regex = new RegExp(`<${tag}[^>]*>[\\s\\S]*?<\\/${tag}>`, 'gi');
    sanitized = sanitized.replace(regex, '');
    // Also strip self-closing variants
    sanitized = sanitized.replace(new RegExp(`<${tag}[^>]*\\/?>`, 'gi'), '');
  }

  // Strip dangerous event handler attributes (onclick, onerror, onload, etc.)
  sanitized = sanitized.replace(DANGEROUS_ATTRS, ' data-removed=');

  // Strip javascript: and data: URIs from href and src attributes
  sanitized = sanitized.replace(
    /(<[^>]+\s(?:href|src|action)\s*=\s*["']?)\s*(javascript|vbscript|data)\s*:/gi,
    '$1#blocked:'
  );

  return sanitized;
}
