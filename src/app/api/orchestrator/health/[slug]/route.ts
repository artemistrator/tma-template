import { NextRequest, NextResponse } from 'next/server';
import { requireOrchestratorAuth } from '@/lib/orchestrator/auth';
import { DIRECTUS_URL } from '@/lib/orchestrator/admin-client';

const DIRECTUS_TOKEN = () => process.env.DIRECTUS_ADMIN_TOKEN || '';

/** Fetch JSON from Directus REST API (bypass SDK caching issues) */
async function directusFetch(path: string) {
  const res = await fetch(`${DIRECTUS_URL}${path}`, {
    headers: { Authorization: `Bearer ${DIRECTUS_TOKEN()}` },
    cache: 'no-store',
  });
  return res.json();
}

/**
 * GET /api/orchestrator/health/:slug
 * Check that a tenant is properly set up: tenant exists, data is present,
 * config API returns a valid response.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const authError = requireOrchestratorAuth(request);
  if (authError) return authError;

  try {
    const { slug } = await params;
    const issues: string[] = [];

    // 1. Check tenant exists (direct REST with slug filter — SDK has caching issues)
    const tenantData = await directusFetch(`/items/tenants?filter[slug][_eq]=${encodeURIComponent(slug)}&fields=id,slug,name,config&limit=1`);
    const tenant = (tenantData.data || [])[0] as Record<string, unknown> | undefined;

    if (!tenant) {
      return NextResponse.json({
        success: false,
        healthy: false,
        slug,
        error: `Tenant "${slug}" not found`,
      }, { status: 404 });
    }

    const tenantSlug = String(tenant.slug);
    const config = tenant.config as Record<string, unknown> | undefined;
    const businessType = config?.businessType as string | undefined;

    if (!businessType) {
      issues.push('Tenant config.businessType is not set');
    }

    // 2. Count data by business type (use slug, not numeric ID — tenant_id stores slug)
    const counts: Record<string, number> = {};

    const countCollection = async (name: string) => {
      try {
        const res = await directusFetch(
          `/items/${name}?filter[tenant_id][_eq]=${tenantSlug}&aggregate[count]=id`,
        );
        const count = res.data?.[0]?.count?.id ?? res.data?.length ?? 0;
        counts[name] = typeof count === 'number' ? count : parseInt(count) || 0;
      } catch {
        counts[name] = 0;
      }
    };

    if (businessType === 'ecommerce') {
      await countCollection('products');
      if (counts['products'] === 0) issues.push('No products found');
    } else if (businessType === 'booking') {
      await Promise.all([
        countCollection('services'),
        countCollection('staff'),
        countCollection('working_hours'),
      ]);
      if (counts['services'] === 0) issues.push('No services found');
    } else if (businessType === 'infobiz') {
      await countCollection('info_products');
      if (counts['info_products'] === 0) issues.push('No info products found');
    }

    // 3. Try config API
    let configOk = false;
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || `http://localhost:${process.env.PORT || 3000}`;
      const configRes = await fetch(`${appUrl}/api/config?tenant=${slug}`, {
        signal: AbortSignal.timeout(5000),
        cache: 'no-store',
      });
      const configData = await configRes.json();
      configOk = configData.success === true;
      if (!configOk) {
        issues.push(`Config API error: ${configData.error || 'unknown'}`);
      }
    } catch (err) {
      issues.push(`Config API unreachable: ${err instanceof Error ? err.message : 'timeout'}`);
    }

    const healthy = issues.length === 0;

    console.log(`[Orchestrator] Health check for "${slug}": ${healthy ? 'HEALTHY' : 'UNHEALTHY'}`);

    return NextResponse.json({
      success: true,
      healthy,
      slug,
      businessType: businessType || null,
      counts,
      configApiOk: configOk,
      issues: issues.length > 0 ? issues : undefined,
    });
  } catch (error) {
    console.error('[Orchestrator] Health check error:', error);
    return NextResponse.json(
      { success: false, healthy: false, error: 'Health check failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
