import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireOrchestratorAuth } from '@/lib/orchestrator/auth';
import { getAdminClient, createItems, readItems } from '@/lib/orchestrator/admin-client';

const BulkProductsSchema = z.object({
  tenantSlug: z.string().min(1),
  tenantId: z.string().optional(), // If provided, skip slug lookup
  products: z.array(z.object({
    name: z.string().min(1),
    price: z.number().nonnegative(),
    description: z.string().optional(),
    category: z.string().optional(),
    image: z.string().optional(), // Directus asset UUID or URL
    status: z.enum(['draft', 'published', 'archived']).default('published'),
    stock_quantity: z.number().default(-1), // -1 = unlimited
  })).min(1, 'At least one product is required').max(200),
});

/**
 * POST /api/orchestrator/products
 * Bulk create products for a tenant.
 */
export async function POST(request: NextRequest) {
  const authError = requireOrchestratorAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const validation = BulkProductsSchema.safeParse(body);
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

    // Map to Directus format (tenant_id = slug, not numeric ID — matches seed data convention)
    const items = products.map(p => ({
      tenant_id: tenantSlug,
      name: p.name,
      price: p.price,
      description: p.description || null,
      category: p.category || null,
      image: p.image || null,
      status: p.status,
      stock_quantity: p.stock_quantity,
    }));

    const result = await client.request(createItems('products', items));
    const count = Array.isArray(result) ? result.length : 0;

    console.log(`[Orchestrator] Created ${count} products for tenant ${tenantSlug}`);

    return NextResponse.json({
      success: true,
      count,
      tenantSlug,
      message: `${count} products created`,
    });
  } catch (error) {
    console.error('[Orchestrator] Products creation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create products', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
