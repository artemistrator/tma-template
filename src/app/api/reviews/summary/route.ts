import { NextRequest, NextResponse } from 'next/server';
import { getReviewSummary, getTenantBySlug } from '@/lib/directus';

// Simple in-memory cache for summaries (TTL 5 min)
const cache = new Map<string, { data: unknown; expiresAt: number }>();
const CACHE_TTL = 30 * 1000; // 30 seconds — short TTL so approved reviews show quickly

/**
 * GET /api/reviews/summary
 * Returns average rating, total count, and distribution for a tenant or target
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const tenantSlug = searchParams.get('tenant');
    if (!tenantSlug) {
      return NextResponse.json({ error: 'tenant parameter is required' }, { status: 400 });
    }

    const targetType = searchParams.get('target_type') || undefined;
    const targetId = searchParams.get('target_id') || undefined;

    // Check feature flag
    const tenant = await getTenantBySlug(tenantSlug);
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }
    const features = (tenant.config as Record<string, unknown>)?.features as Record<string, unknown> | undefined;
    const reviewsConfig = features?.reviews as { enabled?: boolean } | undefined;
    if (!reviewsConfig?.enabled) {
      return NextResponse.json({ averageRating: 0, totalReviews: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } });
    }

    // Check cache
    const cacheKey = `${tenantSlug}:${targetType || ''}:${targetId || ''}`;
    const cached = cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return NextResponse.json(cached.data);
    }

    const summary = await getReviewSummary(tenantSlug, targetType, targetId);

    // Store in cache
    cache.set(cacheKey, { data: summary, expiresAt: Date.now() + CACHE_TTL });

    return NextResponse.json(summary);
  } catch (error) {
    console.error('[Reviews Summary API] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch review summary' }, { status: 500 });
  }
}
