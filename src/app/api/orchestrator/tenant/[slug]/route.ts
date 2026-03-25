import { NextRequest, NextResponse } from 'next/server';
import { requireOrchestratorAuth } from '@/lib/orchestrator/auth';
import { getAdminClient, readItems, deleteItems, deleteItem } from '@/lib/orchestrator/admin-client';

/**
 * DELETE /api/orchestrator/tenant/:slug
 * Delete a tenant and ALL associated data (products, services, orders, etc.).
 * Used when the orchestrator needs to rebuild from scratch.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const authError = requireOrchestratorAuth(request);
  if (authError) return authError;

  try {
    const { slug } = await params;
    const client = await getAdminClient();

    // Find tenant (fetch all + filter in JS — Directus slug filter unreliable for new records)
    const allTenants = await client.request(
      readItems('tenants', { limit: -1 }),
    ) as Array<Record<string, unknown>>;
    const tenants = allTenants.filter(t => t.slug === slug);

    if (tenants.length === 0) {
      return NextResponse.json(
        { success: false, error: `Tenant "${slug}" not found` },
        { status: 404 },
      );
    }

    const tenantId = String(tenants[0].id);
    const deleted: Record<string, number> = {};

    // Delete related data in each collection (order matters — children first)
    // NOTE: tenant_id field stores the SLUG, not the numeric Directus ID
    const collections = [
      'orders', 'bookings', 'leads',
      'products', 'services', 'info_products',
      'staff', 'working_hours', 'blocked_dates',
      'product_categories', 'product_variants', 'promo_codes',
    ];

    for (const collection of collections) {
      try {
        const items = await client.request(
          readItems(collection, {
            filter: { tenant_id: { _eq: slug } },
            fields: ['id'],
            limit: -1,
          }),
        ) as Array<{ id: string | number }>;

        if (items.length > 0) {
          const ids = items.map(i => String(i.id));
          await client.request(deleteItems(collection, ids));
          deleted[collection] = items.length;
        }
      } catch {
        // Collection might not exist — skip silently
      }
    }

    // Delete the tenant itself (by numeric ID)
    await client.request(deleteItem('tenants', tenantId));
    deleted['tenants'] = 1;

    // Delete direct config file if exists
    const fs = await import('fs/promises');
    const path = await import('path');
    const configPath = path.join(process.cwd(), '.data', 'direct-configs', `${slug}.json`);
    try {
      await fs.unlink(configPath);
      deleted['direct_config'] = 1;
    } catch {
      // No direct config file — ok
    }

    console.log(`[Orchestrator] Tenant "${slug}" deleted:`, deleted);

    return NextResponse.json({
      success: true,
      slug,
      deleted,
      message: `Tenant "${slug}" and all associated data deleted`,
    });
  } catch (error) {
    console.error('[Orchestrator] Tenant deletion error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete tenant', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
