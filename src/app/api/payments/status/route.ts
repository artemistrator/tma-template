import { NextRequest, NextResponse } from 'next/server';
import { createRateLimiter } from '@/lib/rate-limit';

const limiter = createRateLimiter({ limit: 30, windowMs: 60_000, prefix: 'pay-status' });

const DIRECTUS_URL = process.env.DIRECTUS_URL || process.env.NEXT_PUBLIC_DIRECTUS_URL || 'http://localhost:8055';
const DIRECTUS_TOKEN = process.env.DIRECTUS_ADMIN_TOKEN || '';

/**
 * GET /api/payments/status?orderId=...&tenant=...
 *
 * Check payment status for an order.
 * Used for polling on the client side after redirect from YooKassa.
 */
export async function GET(request: NextRequest) {
  const blocked = limiter.check(request);
  if (blocked) return blocked;

  const orderId = request.nextUrl.searchParams.get('orderId');
  const tenantSlug = request.nextUrl.searchParams.get('tenant');

  if (!orderId || !tenantSlug) {
    return NextResponse.json(
      { success: false, error: 'orderId and tenant are required' },
      { status: 400 },
    );
  }

  try {
    const res = await fetch(
      `${DIRECTUS_URL}/items/orders/${orderId}?fields=id,status,payment_method,payment_status,payment_id,total`,
      {
        headers: { Authorization: `Bearer ${DIRECTUS_TOKEN}` },
        cache: 'no-store',
      },
    );

    const data = await res.json();
    const order = data.data;

    if (!order) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      orderId: order.id,
      status: order.status,
      paymentMethod: order.payment_method || null,
      paymentStatus: order.payment_status || null,
      paymentId: order.payment_id || null,
      total: order.total,
    });
  } catch (error) {
    console.error('[Payments] Status check error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check status' },
      { status: 500 },
    );
  }
}
