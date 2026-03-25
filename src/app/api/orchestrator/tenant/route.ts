import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireOrchestratorAuth } from '@/lib/orchestrator/auth';
import { DIRECTUS_URL } from '@/lib/orchestrator/admin-client';
import { createRateLimiter } from '@/lib/rate-limit';

const DIRECTUS_TOKEN = () => process.env.DIRECTUS_ADMIN_TOKEN || '';

/** Direct fetch to Directus REST API (bypass SDK/Next.js caching) */
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

const limiter = createRateLimiter({ limit: 10, windowMs: 3_600_000, prefix: 'orch-tenant' }); // 10/hour

const CreateTenantSchema = z.object({
  name: z.string().min(1, 'Tenant name is required'),
  slug: z.string().min(2).max(60).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with dashes'),
  config: z.object({
    businessType: z.enum(['ecommerce', 'booking', 'infobiz']),
    currency: z.string().default('USD'),
    locale: z.string().default('en'),
    theme: z.object({
      primaryColor: z.string().optional(),
      secondaryColor: z.string().optional(),
    }).optional(),
    style: z.object({
      tone: z.enum(['premium', 'friendly', 'bold', 'minimal']).optional(),
      density: z.enum(['airy', 'balanced', 'compact']).optional(),
      visual: z.enum(['soft', 'sharp', 'layered']).optional(),
    }).optional(),
    homeScenario: z.string().optional(),
    contacts: z.object({
      phone: z.string().optional(),
      telegram: z.string().optional(),
      whatsapp: z.string().optional(),
      address: z.string().optional(),
      socials: z.array(z.object({
        type: z.enum(['instagram', 'vk', 'youtube', 'tiktok']),
        url: z.string(),
      })).optional(),
    }).optional(),
    cta: z.object({
      text: z.string().optional(),
      sticky: z.boolean().default(true),
      page: z.string().default('catalog'),
      secondaryText: z.string().optional(),
      secondaryAction: z.string().optional(),
    }).optional(),
    sections: z.record(z.string(), z.boolean()).optional(),
    sectionOrder: z.array(z.string()).optional(),
  }),
});

/**
 * POST /api/orchestrator/tenant
 * Create a new tenant in Directus.
 */
export async function POST(request: NextRequest) {
  const authError = requireOrchestratorAuth(request);
  if (authError) return authError;

  const blocked = limiter.check(request);
  if (blocked) return blocked;

  try {
    const body = await request.json();
    const validation = CreateTenantSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: validation.error.issues },
        { status: 400 },
      );
    }

    const { name, slug, config } = validation.data;

    // Check slug uniqueness via direct REST (bypass SDK/Next.js caching)
    const existing = await directusFetch(`/items/tenants?filter[slug][_eq]=${encodeURIComponent(slug)}&fields=id&limit=1`);
    if (existing.data && existing.data.length > 0) {
      return NextResponse.json(
        { success: false, error: `Tenant with slug "${slug}" already exists` },
        { status: 409 },
      );
    }

    // Create tenant via direct REST
    const createResult = await directusFetch('/items/tenants', {
      method: 'POST',
      body: JSON.stringify({ name, slug, config }),
    });

    if (!createResult.data) {
      return NextResponse.json(
        { success: false, error: 'Failed to create tenant in Directus', details: createResult.errors },
        { status: 500 },
      );
    }

    const tenantId = String(createResult.data.id);
    console.log(`[Orchestrator] Tenant created: ${slug} (${tenantId})`);

    return NextResponse.json({
      success: true,
      tenantId,
      slug,
      message: `Tenant "${name}" created`,
    });
  } catch (error) {
    console.error('[Orchestrator] Tenant creation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create tenant', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
