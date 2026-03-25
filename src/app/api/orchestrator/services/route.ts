import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireOrchestratorAuth } from '@/lib/orchestrator/auth';
import { getAdminClient, createItems, readItems } from '@/lib/orchestrator/admin-client';

const BulkServicesSchema = z.object({
  tenantSlug: z.string().min(1),
  tenantId: z.string().optional(), // If provided, skip slug lookup
  services: z.array(z.object({
    name: z.string().min(1),
    price: z.number().nonnegative(),
    duration: z.number().int().positive().optional(), // minutes
    description: z.string().optional(),
    category: z.string().optional(),
    image: z.string().optional(),
    status: z.enum(['active', 'inactive']).default('active'),
  })).min(1, 'At least one service is required').max(200),
});

/**
 * POST /api/orchestrator/services
 * Bulk create services for a booking tenant.
 */
export async function POST(request: NextRequest) {
  const authError = requireOrchestratorAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const validation = BulkServicesSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: validation.error.issues },
        { status: 400 },
      );
    }

    const { tenantSlug, tenantId: providedTenantId, services } = validation.data;
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

    const items = services.map(s => ({
      tenant_id: tenantSlug,
      name: s.name,
      price: s.price,
      duration: s.duration || null,
      description: s.description || null,
      category: s.category || null,
      image: s.image || null,
      status: s.status,
    }));

    const result = await client.request(createItems('services', items));
    const count = Array.isArray(result) ? result.length : 0;

    console.log(`[Orchestrator] Created ${count} services for tenant ${tenantSlug}`);

    return NextResponse.json({
      success: true,
      count,
      tenantSlug,
      message: `${count} services created`,
    });
  } catch (error) {
    console.error('[Orchestrator] Services creation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create services', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
