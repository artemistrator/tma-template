/**
 * Tenant resolution utilities.
 *
 * Supports two routing modes:
 *   1. Subdomain: pizza.example.com → tenant "pizza"
 *   2. Query param (fallback): example.com/?tenant=pizza
 *
 * Configuration:
 *   ROOT_DOMAIN=example.com (or NEXT_PUBLIC_ROOT_DOMAIN for client-side)
 *   When set, subdomain routing is active.
 *   When unset, falls back to query param mode.
 */

/**
 * Extract tenant slug from hostname (subdomain-based routing).
 *
 * Examples:
 *   pizza.example.com  → "pizza"
 *   admin.example.com  → null (reserved)
 *   example.com        → null (root domain, no tenant)
 *   pizza.localhost     → "pizza"
 *   localhost           → null
 *
 * Returns null if no subdomain or subdomain is reserved.
 */
export function getTenantFromHostname(hostname: string, rootDomain?: string): string | null {
  // Remove port if present
  const host = hostname.split(':')[0];
  const root = (rootDomain || '').split(':')[0];

  if (!root) {
    // No root domain configured — check for *.localhost pattern (dev)
    if (host.endsWith('.localhost')) {
      const sub = host.slice(0, -'.localhost'.length);
      if (sub && !RESERVED_SUBDOMAINS.has(sub)) return sub;
    }
    return null;
  }

  // Must end with .rootDomain
  if (!host.endsWith(`.${root}`)) return null;

  // Extract subdomain part
  const sub = host.slice(0, -(root.length + 1));

  // Must be a single-level subdomain (no dots)
  if (!sub || sub.includes('.')) return null;

  // Skip reserved subdomains
  if (RESERVED_SUBDOMAINS.has(sub)) return null;

  return sub;
}

/** Subdomains that should not be treated as tenant slugs */
const RESERVED_SUBDOMAINS = new Set([
  'www',
  'admin',
  'api',
  'app',
  'mail',
  'smtp',
  'ftp',
  'cdn',
  'static',
  'assets',
  'staging',
  'dev',
]);

/**
 * Build a URL for a specific tenant.
 *
 * If ROOT_DOMAIN is set: https://pizza.example.com/path
 * Otherwise: https://example.com/path?tenant=pizza
 */
export function buildTenantUrl(slug: string, path: string = '/', rootDomain?: string, protocol: string = 'https'): string {
  const root = rootDomain || process.env.NEXT_PUBLIC_ROOT_DOMAIN || process.env.ROOT_DOMAIN || '';

  if (root) {
    // Subdomain mode
    const base = `${protocol}://${slug}.${root}`;
    return path === '/' ? base : `${base}${path}`;
  }

  // Fallback: query param mode
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'http://localhost:3009';
  const separator = path.includes('?') ? '&' : '?';
  return `${appUrl}${path}${separator}tenant=${slug}`;
}

/**
 * Get the root domain from env (server-side).
 */
export function getRootDomain(): string {
  return process.env.ROOT_DOMAIN || process.env.NEXT_PUBLIC_ROOT_DOMAIN || '';
}

/**
 * Check if subdomain routing is enabled.
 */
export function isSubdomainRoutingEnabled(): boolean {
  return !!getRootDomain();
}
