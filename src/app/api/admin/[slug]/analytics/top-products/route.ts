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

interface OrderItem {
  id: string | number;
  name?: string;
  price?: number;
  quantity?: number;
}

/**
 * GET /api/admin/[slug]/analytics/top-products
 * Top products/services by revenue and units sold.
 * Query: period=today|7d|30d, limit=5 (default)
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
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '5');
    const periodStart = getPeriodStart(period);

    const data = await directusFetch(
      `/items/orders?filter[tenant_id][_eq]=${slug}&filter[created_at][_gte]=${periodStart}&filter[status][_neq]=cancelled&fields=id,items&limit=-1`
    );

    const orders: Array<{ id: string; items: OrderItem[] | string }> = data.data || [];

    // Aggregate product metrics
    const productMap: Record<string, { name: string; units: number; revenue: number }> = {};

    for (const order of orders) {
      let items: OrderItem[] = [];
      if (typeof order.items === 'string') {
        try { items = JSON.parse(order.items); } catch { continue; }
      } else if (Array.isArray(order.items)) {
        items = order.items;
      }

      for (const item of items) {
        const id = String(item.id || 'unknown');
        const name = item.name || `Product ${id}`;
        const qty = Number(item.quantity) || 1;
        const price = Number(item.price) || 0;

        if (!productMap[id]) productMap[id] = { name, units: 0, revenue: 0 };
        productMap[id].units += qty;
        productMap[id].revenue += price * qty;
      }
    }

    const products = Object.entries(productMap)
      .map(([id, v]) => ({ id, name: v.name, units: v.units, revenue: Math.round(v.revenue) }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit);

    // Also fetch low-stock products for ecommerce
    const stockData = await directusFetch(
      `/items/products?filter[tenant_id][_eq]=${slug}&filter[status][_eq]=published&filter[stock_quantity][_lte]=3&fields=id,name,stock_quantity&limit=10`
    );
    const lowStock: Array<{ id: string; name: string; stock_quantity: number }> = stockData.data || [];

    return NextResponse.json({
      success: true,
      products,
      lowStock,
      period,
    });
  } catch (error) {
    console.error('[Analytics Top Products] Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load top products analytics' }, { status: 500 });
  }
}
