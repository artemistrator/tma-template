import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireOrchestratorAuth } from '@/lib/orchestrator/auth';
import { getAdminClient, createItems, readItems } from '@/lib/orchestrator/admin-client';

const BulkInfoProductsSchema = z.object({
  tenantSlug: z.string().min(1),
  tenantId: z.string().optional(), // If provided, skip slug lookup
  products: z.array(z.object({
    name: z.string().min(1),
    slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
    type: z.enum(['article', 'pdf', 'course', 'consultation']),
    price: z.number().nonnegative(),
    description: z.string().optional(),
    content: z.string().optional(), // markdown for articles
    image: z.string().optional(),
    file_id: z.string().optional(), // Directus file UUID for PDFs
    external_url: z.string().url().optional(), // for courses
    status: z.enum(['published', 'draft']).default('published'),
  })).min(1, 'At least one info product is required').max(200),
});

/**
 * POST /api/orchestrator/info-products
 * Bulk create info products for an infobiz tenant.
 */
export async function POST(request: NextRequest) {
  const authError = requireOrchestratorAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const validation = BulkInfoProductsSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: validation.error.issues },
        { status: 400 },
      );
    }

    const { tenantSlug, tenantId: providedTenantId, products } = validation.data;
    const client = await getAdminClient();

    let tenantId = providedTenantId;

    if (!tenantId) {
      // Lookup tenant by slug
      const tenants = await client.request(
        readItems('tenants', { filter: { slug: { _eq: tenantSlug } }, limit: 1 }),
      );
      if ((tenants as unknown[]).length === 0) {
        return NextResponse.json(
          { success: false, error: `Tenant "${tenantSlug}" not found` },
          { status: 404 },
        );
      }
      tenantId = String((tenants as Record<string, unknown>[])[0].id);
    }

    const items = products.map(p => ({
      tenant_id: tenantSlug,
      name: p.name,
      slug: p.slug,
      type: p.type,
      price: p.price,
      description: p.description || null,
      content: p.content || null,
      image: p.image || null,
      file_id: p.file_id || null,
      external_url: p.external_url || null,
      status: p.status,
    }));

    const result = await client.request(createItems('info_products', items));
    const count = Array.isArray(result) ? result.length : 0;

    console.log(`[Orchestrator] Created ${count} info products for tenant ${tenantSlug}`);

    return NextResponse.json({
      success: true,
      count,
      tenantSlug,
      message: `${count} info products created`,
    });
  } catch (error) {
    console.error('[Orchestrator] Info products creation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create info products', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
