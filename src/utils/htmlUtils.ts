// src/utils/htmlUtils.ts

/**
 * Minimal HTML special-character escaper.
 *
 * Handles the 5 characters required to prevent HTML injection in text nodes
 * and attribute values.
 *
 * ⚠️  Does NOT block `javascript:` URL scheme — safe only for static data
 *    sources (e.g. bundled JSON). For user-controlled URLs, add a protocol
 *    allowlist (https: / http: only) before passing to src/href attributes.
 */
export function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
