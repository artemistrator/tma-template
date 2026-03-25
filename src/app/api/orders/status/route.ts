import { NextRequest, NextResponse } from 'next/server';

const DIRECTUS_URL = process.env.DIRECTUS_URL || process.env.NEXT_PUBLIC_DIRECTUS_URL || 'http://localhost:8055';
const DIRECTUS_ADMIN_TOKEN = process.env.DIRECTUS_ADMIN_TOKEN || '';

/**
 * POST /api/orders/status
 * Batch fetch order statuses for the frontend.
 * Body: { tenant: string, orderIds: string[] }
 * Returns: { statuses: { [orderId]: status } }
 */
export async function POST(request: NextRequest) {
  try {
    const { tenant, orderIds } = await request.json();

    if (!tenant || !Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Missing tenant or orderIds' },
        { status: 400 },
      );
    }

    // Limit batch size
    const ids = orderIds.slice(0, 50);

    const filter = `filter[tenant_id][_eq]=${encodeURIComponent(tenant)}&filter[id][_in]=${ids.join(',')}&fields=id,status&limit=${ids.length}`;
    const res = await fetch(
      `${DIRECTUS_URL}/items/orders?${filter}`,
      {
        headers: { 'Authorization': `Bearer ${DIRECTUS_ADMIN_TOKEN}` },
        cache: 'no-store',
      },
    );
    const data = await res.json();
    const orders = (data.data || []) as Array<{ id: number | string; status: string }>;

    const statuses: Record<string, string> = {};
    for (const order of orders) {
      statuses[String(order.id)] = order.status;
    }

    return NextResponse.json({ success: true, statuses });
  } catch (error) {
    console.error('[OrderStatus] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch statuses' },
      { status: 500 },
    );
  }
}
