import { NextRequest, NextResponse } from 'next/server';
import { getTenantFromHostname } from '@/lib/tenant';

const ROOT_DOMAIN = process.env.ROOT_DOMAIN || process.env.NEXT_PUBLIC_ROOT_DOMAIN || '';

/**
 * Middleware: subdomain-based tenant routing.
 *
 * Extracts tenant slug from hostname (e.g., pizza.example.com → "pizza")
 * and injects it as `x-tenant-slug` header on all requests.
 *
 * API routes and frontend can read this header to resolve tenant
 * without requiring ?tenant= query parameter.
 *
 * Backward compatible: if no subdomain detected, everything works
 * as before via ?tenant= query param.
 */
export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const tenant = getTenantFromHostname(hostname, ROOT_DOMAIN);

  // Clone headers and inject tenant slug if found
  const requestHeaders = new Headers(request.headers);

  if (tenant) {
    requestHeaders.set('x-tenant-slug', tenant);
  }

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  // Also set on response for client-side reading via cookie (optional)
  if (tenant) {
    response.headers.set('x-tenant-slug', tenant);
  }

  return response;
}

/**
 * Match all routes except static files and Next.js internals.
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public folder files (images, fonts, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|eot)$).*)',
  ],
};
