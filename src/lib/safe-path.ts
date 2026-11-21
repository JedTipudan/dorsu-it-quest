/**
 * Only allow same-site paths for post-login redirects (prevents open redirects).
 * Rejects "//evil.com", "/\evil.com" and anything containing whitespace or backslashes,
 * because browsers strip tabs/newlines and treat "\" like "/" in URLs.
 */
export function safePath(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 512) return null
  return /^\/(?![/\\])[^\s\\]*$/.test(value) ? value : null
}
