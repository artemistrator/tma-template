import { NextRequest, NextResponse } from 'next/server';

const DIRECTUS_URL = process.env.DIRECTUS_URL || process.env.NEXT_PUBLIC_DIRECTUS_URL || 'http://localhost:8055';

interface HealthCheck {
  status: 'ok' | 'degraded' | 'down';
  timestamp: string;
  version: string;
  uptime: number;
  checks: {
    database: CheckResult;
    directus: CheckResult;
  };
}

interface CheckResult {
  status: 'ok' | 'error';
  latencyMs: number;
  error?: string;
}

/**
 * GET /api/health
 *
 * Detailed health check. Validates:
 * - PostgreSQL connectivity (via Directus)
 * - Directus CMS availability
 *
 * Returns 200 if all OK, 503 if any check fails.
 * Query param ?simple=1 returns minimal response (for load balancers).
 */
export async function GET(request: NextRequest) {
  const simple = request.nextUrl.searchParams.get('simple');

  if (simple) {
    return NextResponse.json({ status: 'ok', timestamp: new Date().toISOString() });
  }

  const [directusCheck, dbCheck] = await Promise.all([
    checkDirectus(),
    checkDatabase(),
  ]);

  const allOk = directusCheck.status === 'ok' && dbCheck.status === 'ok';
  const anyDown = directusCheck.status === 'error' || dbCheck.status === 'error';

  const health: HealthCheck = {
    status: allOk ? 'ok' : anyDown ? 'down' : 'degraded',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '0.1.0',
    uptime: process.uptime(),
    checks: {
      directus: directusCheck,
      database: dbCheck,
    },
  };

  return NextResponse.json(health, {
    status: allOk ? 200 : 503,
  });
}

/**
 * Check Directus CMS is responding.
 */
async function checkDirectus(): Promise<CheckResult> {
  const start = Date.now();
  try {
    const res = await fetch(`${DIRECTUS_URL}/server/ping`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    });
    const latencyMs = Date.now() - start;

    if (res.ok) {
      return { status: 'ok', latencyMs };
    }
    return { status: 'error', latencyMs, error: `HTTP ${res.status}` };
  } catch (error) {
    return {
      status: 'error',
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : 'Connection failed',
    };
  }
}

/**
 * Check database connectivity via Directus.
 * Reads a lightweight collection to verify DB is up.
 */
async function checkDatabase(): Promise<CheckResult> {
  const start = Date.now();
  try {
    const res = await fetch(`${DIRECTUS_URL}/items/tenants?limit=1&fields=id`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    });
    const latencyMs = Date.now() - start;

    if (res.ok) {
      return { status: 'ok', latencyMs };
    }
    return { status: 'error', latencyMs, error: `HTTP ${res.status}` };
  } catch (error) {
    return {
      status: 'error',
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : 'Query failed',
    };
  }
}
