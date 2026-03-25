import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminAuth } from '@/lib/admin/auth';
import { DIRECTUS_URL } from '@/lib/orchestrator/admin-client';

const DIRECTUS_TOKEN = () => process.env.DIRECTUS_ADMIN_TOKEN || '';

async function directusFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${DIRECTUS_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${DIRECTUS_TOKEN()}`,
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    cache: 'no-store',
  });
  return res.json();
}

const PickupPointSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  address: z.string().min(1),
  city: z.string().optional(),
  phone: z.string().optional(),
  workingHours: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
});

/**
 * GET /api/admin/[slug]/pickup-points
 * List all pickup points for this tenant.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const auth = requireAdminAuth(request, slug);
  if ('error' in auth) return auth.error;

  try {
    const tenantData = await directusFetch(
      `/items/tenants?filter[slug][_eq]=${encodeURIComponent(slug)}&fields=config&limit=1`,
    );
    const config = (tenantData.data || [])[0]?.config || {};
    const points = config.delivery?.pickupPoints || [];

    return NextResponse.json({ success: true, points });
  } catch (error) {
    console.error('[Admin Pickup] Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load pickup points' }, { status: 500 });
  }
}

/**
 * POST /api/admin/[slug]/pickup-points
 * Add a new pickup point.
 * Only owner can manage pickup points.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const auth = requireAdminAuth(request, slug);
  if ('error' in auth) return auth.error;

  if (auth.session.role !== 'owner') {
    return NextResponse.json({ success: false, error: 'Only owner can manage pickup points' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const validation = PickupPointSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: validation.error.issues },
        { status: 400 },
      );
    }

    // Get current config
    const tenantData = await directusFetch(
      `/items/tenants?filter[slug][_eq]=${encodeURIComponent(slug)}&fields=id,config&limit=1`,
    );
    const tenant = (tenantData.data || [])[0];
    if (!tenant) {
      return NextResponse.json({ success: false, error: 'Tenant not found' }, { status: 404 });
    }

    const config = (tenant.config || {}) as Record<string, unknown>;
    const delivery = (config.delivery || {}) as Record<string, unknown>;
    const points = (delivery.pickupPoints || []) as Array<Record<string, unknown>>;

    // Add new point with generated ID
    const newPoint = {
      ...validation.data,
      id: validation.data.id || crypto.randomUUID().slice(0, 8),
    };
    points.push(newPoint);

    // Save back
    const methods = (delivery.methods || []) as string[];
    if (!methods.includes('pickup')) {
      methods.push('pickup');
    }

    await directusFetch(`/items/tenants/${tenant.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        config: {
          ...config,
          delivery: { ...delivery, pickupPoints: points, methods },
        },
      }),
    });

    return NextResponse.json({ success: true, point: newPoint });
  } catch (error) {
    console.error('[Admin Pickup] Create error:', error);
    return NextResponse.json({ success: false, error: 'Failed to add pickup point' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/[slug]/pickup-points
 * Remove a pickup point by ID (passed in body).
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const auth = requireAdminAuth(request, slug);
  if ('error' in auth) return auth.error;

  if (auth.session.role !== 'owner') {
    return NextResponse.json({ success: false, error: 'Only owner can manage pickup points' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const pointId = body.id;
    if (!pointId) {
      return NextResponse.json({ success: false, error: 'Point ID required' }, { status: 400 });
    }

    const tenantData = await directusFetch(
      `/items/tenants?filter[slug][_eq]=${encodeURIComponent(slug)}&fields=id,config&limit=1`,
    );
    const tenant = (tenantData.data || [])[0];
    if (!tenant) {
      return NextResponse.json({ success: false, error: 'Tenant not found' }, { status: 404 });
    }

    const config = (tenant.config || {}) as Record<string, unknown>;
    const delivery = (config.delivery || {}) as Record<string, unknown>;
    const points = (delivery.pickupPoints || []) as Array<{ id: string }>;
    const filtered = points.filter(p => p.id !== pointId);

    await directusFetch(`/items/tenants/${tenant.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        config: {
          ...config,
          delivery: { ...delivery, pickupPoints: filtered },
        },
      }),
    });

    return NextResponse.json({ success: true, deleted: pointId });
  } catch (error) {
    console.error('[Admin Pickup] Delete error:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete pickup point' }, { status: 500 });
  }
}
