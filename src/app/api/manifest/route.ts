import { NextRequest, NextResponse } from 'next/server';
import { COMPONENT_MANIFEST, MANIFEST_COMPONENT_COUNT, getComponentsForType } from '@/lib/schema/component-manifest';

/** Cache manifest for 1 hour, allow stale for 1 day while revalidating */
const CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
};

/**
 * GET /api/manifest
 *
 * Returns the full component manifest for the orchestrator.
 * Optional query param: ?appType=ecommerce|booking|infobiz — filters to compatible components only.
 *
 * Cached for 1 hour (stale-while-revalidate for 24h).
 */
export async function GET(request: NextRequest) {
  const appType = request.nextUrl.searchParams.get('appType') as 'ecommerce' | 'booking' | 'infobiz' | null;

  if (appType && ['ecommerce', 'booking', 'infobiz'].includes(appType)) {
    const filtered = getComponentsForType(appType);
    return NextResponse.json(
      {
        appType,
        componentCount: filtered.length,
        components: Object.fromEntries(filtered.map(c => [c.name, c])),
      },
      { headers: CACHE_HEADERS },
    );
  }

  return NextResponse.json(
    {
      componentCount: MANIFEST_COMPONENT_COUNT,
      components: COMPONENT_MANIFEST,
    },
    { headers: CACHE_HEADERS },
  );
}
