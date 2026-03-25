import { NextRequest, NextResponse } from 'next/server';
import { sendAlert, alertHealthCheckFailed, alertRecovery } from '@/lib/monitoring/alerts';

const DIRECTUS_URL = process.env.DIRECTUS_URL || process.env.NEXT_PUBLIC_DIRECTUS_URL || 'http://localhost:8055';
const ORCHESTRATOR_SECRET = process.env.ORCHESTRATOR_SECRET;

// Track previous state for recovery alerts
const previousState = new Map<string, boolean>();

/**
 * GET /api/monitoring/check
 *
 * Full monitoring check — designed to be called by external cron (every 5 min).
 * Runs all health checks and sends Telegram alerts on failures.
 *
 * Auth: requires ?secret= matching ORCHESTRATOR_SECRET (reuse existing secret).
 *
 * Returns:
 *  - 200 with all check results
 *  - Sends Telegram alert if any check fails
 *  - Sends recovery alert when a previously failing check passes
 */
export async function GET(request: NextRequest) {
  // Auth check
  const secret = request.nextUrl.searchParams.get('secret');
  if (!ORCHESTRATOR_SECRET || secret !== ORCHESTRATOR_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results: Record<string, { ok: boolean; latencyMs: number; error?: string }> = {};

  // 1. Directus ping
  results.directus = await checkService('Directus', `${DIRECTUS_URL}/server/ping`);

  // 2. Database (via Directus query)
  results.database = await checkService('Database', `${DIRECTUS_URL}/items/tenants?limit=1&fields=id`);

  // 3. Next.js app health (self-check)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
  if (appUrl) {
    results.app = await checkService('Next.js App', `${appUrl}/api/health?simple=1`);
  }

  // Process results: send alerts for failures, recovery for previously failed
  let allOk = true;
  const issues: string[] = [];

  for (const [service, result] of Object.entries(results)) {
    const wasOk = previousState.get(service);

    if (!result.ok) {
      allOk = false;
      issues.push(`${service}: ${result.error}`);

      // Only alert on new failure (not repeated)
      if (wasOk !== false) {
        alertHealthCheckFailed(service, result.error || 'Unknown error');
      }
      previousState.set(service, false);
    } else {
      // Send recovery alert if was previously down
      if (wasOk === false) {
        alertRecovery(service);
      }
      previousState.set(service, true);
    }
  }

  // Summary alert for multi-service failure
  if (issues.length > 1) {
    sendAlert({
      level: 'critical',
      title: 'Multiple Services Down',
      message: issues.map(i => `\u{2022} ${i}`).join('\n'),
      dedupKey: 'multi-service-down',
    }).catch(() => {});
  }

  return NextResponse.json({
    status: allOk ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    checks: results,
  }, {
    status: allOk ? 200 : 503,
  });
}

async function checkService(
  name: string,
  url: string,
): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
  const start = Date.now();
  try {
    const res = await fetch(url, {
      cache: 'no-store',
      signal: AbortSignal.timeout(10000),
    });
    const latencyMs = Date.now() - start;

    if (res.ok) {
      return { ok: true, latencyMs };
    }
    return { ok: false, latencyMs, error: `HTTP ${res.status}` };
  } catch (error) {
    return {
      ok: false,
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : 'Connection failed',
    };
  }
}
