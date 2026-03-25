import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireOrchestratorAuth } from '@/lib/orchestrator/auth';
import { getAdminClient, createItems, deleteItems, readItems } from '@/lib/orchestrator/admin-client';

const WorkingHoursSchema = z.object({
  tenantSlug: z.string().min(1),
  tenantId: z.string().optional(), // If provided, skip slug lookup
  hours: z.array(z.object({
    day_of_week: z.number().int().min(0).max(6), // 0=Sun … 6=Sat
    start_time: z.string().regex(/^\d{2}:\d{2}$/, 'Format: HH:MM'),
    end_time: z.string().regex(/^\d{2}:\d{2}$/, 'Format: HH:MM'),
    is_day_off: z.boolean().default(false),
  })).min(1).max(7),
});

/**
 * POST /api/orchestrator/working-hours
 * Set working hours for a booking tenant.
 * Replaces any existing working hours for this tenant.
 */
export async function POST(request: NextRequest) {
  const authError = requireOrchestratorAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const validation = WorkingHoursSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: validation.error.issues },
        { status: 400 },
      );
    }

    const { tenantSlug, tenantId: providedTenantId, hours } = validation.data;
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

    // Delete existing working hours for this tenant
    const existing = await client.request(
      readItems('working_hours', { filter: { tenant_id: { _eq: tenantSlug } }, fields: ['id'] }),
    ) as Array<{ id: string | number }>;

    if (existing.length > 0) {
      const ids = existing.map(e => String(e.id));
      await client.request(deleteItems('working_hours', ids));
    }

    // Create new working hours
    const items = hours.map(h => ({
      tenant_id: tenantSlug,
      day_of_week: h.day_of_week,
      start_time: h.start_time,
      end_time: h.end_time,
      is_day_off: h.is_day_off,
    }));

    await client.request(createItems('working_hours', items));

    console.log(`[Orchestrator] Set ${hours.length} working hour entries for tenant ${tenantSlug}`);

    return NextResponse.json({
      success: true,
      count: hours.length,
      tenantSlug,
      message: `Working hours set (${hours.length} days)`,
    });
  } catch (error) {
    console.error('[Orchestrator] Working hours error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to set working hours', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
