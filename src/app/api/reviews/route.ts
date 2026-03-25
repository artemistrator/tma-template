import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getReviewsByTenant, getTenantBySlug } from '@/lib/directus';
import { createDirectus, rest, createItems, readItems } from '@directus/sdk';
import { createRateLimiter } from '@/lib/rate-limit';

const DIRECTUS_URL = process.env.DIRECTUS_URL || process.env.NEXT_PUBLIC_DIRECTUS_URL || 'http://localhost:8055';
const DIRECTUS_TOKEN = () => process.env.DIRECTUS_ADMIN_TOKEN || '';

const directus = createDirectus(DIRECTUS_URL).with(rest({
  onRequest: (options) => ({
    ...options,
    cache: 'no-store',
    headers: {
      ...options.headers,
      Authorization: `Bearer ${DIRECTUS_TOKEN()}`,
    },
  }),
}));

const submitLimiter = createRateLimiter({ limit: 5, windowMs: 60_000 * 60, prefix: 'reviews-submit' });

// --- Feature flag helper ---

interface ReviewsFeatureConfig {
  enabled: boolean;
  businessReviews?: boolean;
  productReviews?: boolean;
  allowSubmission?: boolean;
  moderation?: boolean;
}

function getReviewsConfig(tenantConfig: Record<string, unknown>): ReviewsFeatureConfig | null {
  const features = tenantConfig?.features as Record<string, unknown> | undefined;
  const reviews = features?.reviews as ReviewsFeatureConfig | undefined;
  if (!reviews || !reviews.enabled) return null;
  return reviews;
}

// --- Validation ---

const CreateReviewSchema = z.object({
  tenantId: z.string().min(1),
  authorName: z.string().min(1).max(255),
  telegramUserId: z.number().optional(),
  rating: z.number().int().min(1).max(5),
  text: z.string().min(1).max(1000),
  targetType: z.enum(['business', 'product', 'service', 'info_product']).optional().default('business'),
  targetId: z.string().optional(),
});

/**
 * GET /api/reviews
 * Public endpoint — returns approved reviews for a tenant
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const tenantSlug = searchParams.get('tenant');
    if (!tenantSlug) {
      return NextResponse.json({ error: 'tenant parameter is required' }, { status: 400 });
    }

    // Check feature flag
    const tenant = await getTenantBySlug(tenantSlug);
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }
    const reviewsConfig = getReviewsConfig(tenant.config as Record<string, unknown>);
    if (!reviewsConfig) {
      return NextResponse.json({ data: [], meta: { total: 0, page: 1, limit: 20 } });
    }

    const targetType = searchParams.get('target_type') || undefined;
    const targetId = searchParams.get('target_id') || undefined;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const offset = (page - 1) * limit;

    // Check sub-flags
    if (targetType === 'business' && !reviewsConfig.businessReviews) {
      return NextResponse.json({ data: [], meta: { total: 0, page, limit } });
    }
    if (targetType && targetType !== 'business' && !reviewsConfig.productReviews) {
      return NextResponse.json({ data: [], meta: { total: 0, page, limit } });
    }

    const reviews = await getReviewsByTenant(tenantSlug, {
      targetType,
      targetId,
      limit: limit + 1, // fetch one extra to detect if there are more
      offset,
    });

    const hasMore = reviews.length > limit;
    const data = hasMore ? reviews.slice(0, limit) : reviews;

    return NextResponse.json({
      data,
      meta: { page, limit, hasMore },
    });
  } catch (error) {
    console.error('[Reviews API] GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 });
  }
}

/**
 * POST /api/reviews
 * Public endpoint — submit a new review (pending moderation)
 */
export async function POST(request: NextRequest) {
  const blocked = submitLimiter.check(request);
  if (blocked) return blocked;

  try {
    const body = await request.json();
    const validation = CreateReviewSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.issues },
        { status: 400 },
      );
    }

    const data = validation.data;

    // Check feature flag
    const tenant = await getTenantBySlug(data.tenantId);
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }
    const reviewsConfig = getReviewsConfig(tenant.config as Record<string, unknown>);
    if (!reviewsConfig || !reviewsConfig.allowSubmission) {
      return NextResponse.json({ error: 'Reviews are not enabled for this tenant' }, { status: 403 });
    }

    // Check sub-flags
    if (data.targetType === 'business' && !reviewsConfig.businessReviews) {
      return NextResponse.json({ error: 'Business reviews are not enabled' }, { status: 403 });
    }
    if (data.targetType && data.targetType !== 'business' && !reviewsConfig.productReviews) {
      return NextResponse.json({ error: 'Product reviews are not enabled' }, { status: 403 });
    }

    // Check duplicate: same telegram user + tenant + target within last 24h
    if (data.telegramUserId) {
      const recentFilter: Record<string, unknown> = {
        tenant_id: { _eq: data.tenantId },
        telegram_user_id: { _eq: data.telegramUserId },
        created_at: { _gte: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() },
      };
      if (data.targetType && data.targetType !== 'business' && data.targetId) {
        recentFilter.target_type = { _eq: data.targetType };
        recentFilter.target_id = { _eq: data.targetId };
      } else {
        recentFilter.target_type = { _eq: 'business' };
      }

      try {
        const existing = await directus.request(
          readItems('reviews', { filter: recentFilter, limit: 1 })
        );
        if ((existing as unknown[]).length > 0) {
          return NextResponse.json(
            { error: 'You have already submitted a review recently' },
            { status: 429 },
          );
        }
      } catch {
        // If check fails, allow submission anyway
      }
    }

    // Determine initial status
    const status = reviewsConfig.moderation !== false ? 'pending' : 'approved';

    const reviewData = {
      tenant_id: data.tenantId,
      author_name: data.authorName,
      telegram_user_id: data.telegramUserId || null,
      rating: data.rating,
      text: data.text,
      target_type: data.targetType || 'business',
      target_id: data.targetId || null,
      status,
      approved_at: status === 'approved' ? new Date().toISOString() : null,
    };

    const result = await directus.request(createItems('reviews', [reviewData]));
    const reviewId = (result as Record<string, unknown>[])?.[0]?.id;

    console.log(`[Reviews API] Review created: ${reviewId} (${status}) for tenant ${data.tenantId}`);

    return NextResponse.json({
      success: true,
      id: reviewId,
      status,
      message: status === 'pending'
        ? 'Review submitted and awaiting moderation'
        : 'Review published',
    });
  } catch (error) {
    console.error('[Reviews API] POST error:', error);
    return NextResponse.json({ error: 'Failed to submit review' }, { status: 500 });
  }
}
