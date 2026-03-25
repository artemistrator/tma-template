import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireOrchestratorAuth } from '@/lib/orchestrator/auth';
import { getAdminClient, createItems, readItems } from '@/lib/orchestrator/admin-client';

const BulkStaffSchema = z.object({
  tenantSlug: z.string().min(1),
  tenantId: z.string().optional(), // If provided, skip slug lookup
  staff: z.array(z.object({
    name: z.string().min(1),
    bio: z.string().optional(),
    image: z.string().optional(), // Directus asset UUID
    status: z.enum(['active', 'inactive']).default('active'),
  })).min(1, 'At least one staff member is required').max(50),
});

/**
 * POST /api/orchestrator/staff
 * Bulk create staff members for a booking tenant.
 */
export async function POST(request: NextRequest) {
  const authError = requireOrchestratorAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const validation = BulkStaffSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: validation.error.issues },
        { status: 400 },
      );
    }

    const { tenantSlug, tenantId: providedTenantId, staff } = validation.data;
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

    const items = staff.map(s => ({
      tenant_id: tenantSlug,
      name: s.name,
      bio: s.bio || null,
      image: s.image || null,
      status: s.status,
    }));

    const result = await client.request(createItems('staff', items));
    const count = Array.isArray(result) ? result.length : 0;

    console.log(`[Orchestrator] Created ${count} staff for tenant ${tenantSlug}`);

    return NextResponse.json({
      success: true,
      count,
      tenantSlug,
      message: `${count} staff members created`,
    });
  } catch (error) {
    console.error('[Orchestrator] Staff creation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create staff', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
