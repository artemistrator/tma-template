import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireOrchestratorAuth } from '@/lib/orchestrator/auth';
import { DIRECTUS_URL } from '@/lib/orchestrator/admin-client';

export const dynamic = 'force-dynamic';

const DIRECTUS_TOKEN = () => process.env.DIRECTUS_ADMIN_TOKEN || '';

/** Direct fetch to Directus REST API (bypass SDK caching issues) */
async function directusFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${DIRECTUS_URL}${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${DIRECTUS_TOKEN()}`,
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    cache: 'no-store',
  });
  return res.json();
}

const MarketingSchema = z.object({
  tenantSlug: z.string().min(1),
  subtitle: z.string().max(200).optional(),
  features: z.array(z.object({
    icon: z.string(),
    title: z.string(),
    description: z.string(),
  })).max(8).optional(),
  testimonials: z.array(z.object({
    name: z.string(),
    role: z.string().optional(),
    rating: z.number().min(1).max(5),
    text: z.string(),
    source: z.string().optional(),
  })).max(10).optional(),
  faq: z.array(z.object({
    question: z.string(),
    answer: z.string(),
  })).max(10).optional(),
  promo: z.object({
    title: z.string(),
    subtitle: z.string().optional(),
    ctaText: z.string().optional(),
    emoji: z.string().optional(),
  }).optional(),
});

/**
 * POST /api/orchestrator/marketing
 * Set marketing content (subtitle, features, testimonials, FAQ) for a tenant.
 * Merges into tenant.config.marketing field.
 */
export async function POST(request: NextRequest) {
  const authError = requireOrchestratorAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const validation = MarketingSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: validation.error.issues },
        { status: 400 },
      );
    }

    const { tenantSlug, subtitle, features, testimonials, faq, promo } = validation.data;

    // Find tenant via direct REST with slug filter (bypass SDK caching)
    const tenantData = await directusFetch(`/items/tenants?filter[slug][_eq]=${encodeURIComponent(tenantSlug)}&fields=id,slug,config&limit=1`);
    const tenant = (tenantData.data || [])[0] as Record<string, unknown> | undefined;

    if (!tenant) {
      return NextResponse.json(
        { success: false, error: `Tenant "${tenantSlug}" not found` },
        { status: 404 },
      );
    }

    // Build marketing object
    const marketing: Record<string, unknown> = {};
    if (subtitle) marketing.subtitle = subtitle;
    if (features) marketing.features = features;
    if (testimonials) marketing.testimonials = testimonials;
    if (faq) marketing.faq = faq;
    if (promo) marketing.promo = promo;

    // Merge into existing config
    const existingConfig = (tenant.config as Record<string, unknown>) || {};
    const updatedConfig = { ...existingConfig, marketing };

    // Update via direct REST
    await directusFetch(`/items/tenants/${tenant.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ config: updatedConfig }),
    });

    console.log(`[Orchestrator] Marketing set for "${tenantSlug}":`,
      Object.keys(marketing).join(', '));

    return NextResponse.json({
      success: true,
      tenantSlug,
      updated: Object.keys(marketing),
    });
  } catch (error) {
    console.error('[Orchestrator] Marketing update error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update marketing', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
