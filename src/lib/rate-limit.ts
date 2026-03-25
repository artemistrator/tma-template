import { NextRequest, NextResponse } from 'next/server';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

/**
 * Simple in-memory sliding-window rate limiter.
 * Each limiter instance has its own counter map keyed by IP.
 *
 * Usage in a route:
 *   const limiter = createRateLimiter({ limit: 10, windowMs: 60_000 });
 *
 *   export async function POST(request: NextRequest) {
 *     const blocked = limiter.check(request);
 *     if (blocked) return blocked;
 *     // ... handle request
 *   }
 */

const store = new Map<string, RateLimitEntry>();

// Periodically clean up expired entries (every 60s)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    store.forEach((entry, key) => {
      if (now > entry.resetAt) {
        store.delete(key);
      }
    });
  }, 60_000);
}

function getClientKey(request: NextRequest, prefix: string): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || 'unknown';
  return `${prefix}:${ip}`;
}

interface RateLimiterOptions {
  /** Max requests per window */
  limit: number;
  /** Window duration in milliseconds */
  windowMs: number;
  /** Optional prefix to isolate counters per route group */
  prefix?: string;
}

interface RateLimiter {
  /** Returns a 429 NextResponse if rate limit exceeded, or null if OK */
  check(request: NextRequest): NextResponse | null;
}

export function createRateLimiter(options: RateLimiterOptions): RateLimiter {
  const { limit, windowMs, prefix = 'rl' } = options;

  return {
    check(request: NextRequest): NextResponse | null {
      const key = getClientKey(request, prefix);
      const now = Date.now();

      const entry = store.get(key);

      if (!entry || now > entry.resetAt) {
        // New window
        store.set(key, { count: 1, resetAt: now + windowMs });
        return null;
      }

      if (entry.count >= limit) {
        const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
        return NextResponse.json(
          { error: 'Too many requests. Please try again later.' },
          {
            status: 429,
            headers: {
              'Retry-After': String(retryAfter),
              'X-RateLimit-Limit': String(limit),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': String(entry.resetAt),
            },
          }
        );
      }

      entry.count++;
      return null;
    },
  };
}
