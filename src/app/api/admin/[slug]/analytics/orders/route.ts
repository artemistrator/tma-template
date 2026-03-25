import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/admin/auth';
import { DIRECTUS_URL } from '@/lib/orchestrator/admin-client';

const DIRECTUS_TOKEN = () => process.env.DIRECTUS_ADMIN_TOKEN || '';

async function directusFetch(path: string) {
  const res = await fetch(`${DIRECTUS_URL}${path}`, {
    headers: { Authorization: `Bearer ${DIRECTUS_TOKEN()}` },
    cache: 'no-store',
  });
  return res.json();
}

function getPeriodStart(period: string): string {
  const d = new Date();
  if (period === '7d') d.setDate(d.getDate() - 7);
  else if (period === '30d') d.setDate(d.getDate() - 30);
  else d.setHours(0, 0, 0, 0);
  return d.toISOString().split('T')[0];
}

/**
 * GET /api/admin/[slug]/analytics/orders
 * Order counts by status + trend over time.
 * Query: period=today|7d|30d
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const auth = requireAdminAuth(request, slug);
  if ('error' in auth) return auth.error;

  try {
    const period = request.nextUrl.searchParams.get('period') || '7d';
    const periodStart = getPeriodStart(period);

    const data = await directusFetch(
      `/items/orders?filter[tenant_id][_eq]=${slug}&filter[created_at][_gte]=${periodStart}&fields=id,status,created_at&limit=-1`
    );

    const orders: Array<{ id: string; status: string; created_at: string }> = data.data || [];

    // Count by status
    const statusMap: Record<string, number> = {};
    const dayMap: Record<string, number> = {};

    for (const order of orders) {
      statusMap[order.status] = (statusMap[order.status] || 0) + 1;
      const day = order.created_at?.split('T')[0];
      if (day) dayMap[day] = (dayMap[day] || 0) + 1;
    }

    const byStatus = Object.entries(statusMap)
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count);

    // Build daily trend
    const days = period === '30d' ? 30 : period === '7d' ? 7 : 1;
    const trend = Array.from({ length: days }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (days - 1 - i));
      const date = d.toISOString().split('T')[0];
      return { date, count: dayMap[date] || 0 };
    });

    return NextResponse.json({
      success: true,
      total: orders.length,
      byStatus,
      trend,
      period,
    });
  } catch (error) {
    console.error('[Analytics Orders] Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load order analytics' }, { status: 500 });
  }
}
