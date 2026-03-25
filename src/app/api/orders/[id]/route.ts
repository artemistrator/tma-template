import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createDirectus, rest, readItems, updateItem, authentication } from '@directus/sdk';

const DIRECTUS_URL = process.env.DIRECTUS_URL || process.env.NEXT_PUBLIC_DIRECTUS_URL || 'http://localhost:8055';
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_ADMIN_ID = process.env.TELEGRAM_ADMIN_ID;

async function getAdminClient() {
  const email = process.env.DIRECTUS_ADMIN_EMAIL;
  const password = process.env.DIRECTUS_ADMIN_PASSWORD;
  if (email && password) {
    const client = createDirectus(DIRECTUS_URL).with(authentication('json')).with(rest());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (client as any).login(email, password);
    return client;
  }
  return createDirectus(DIRECTUS_URL).with(rest());
}

const PatchOrderSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled']),
  tenantId: z.string().min(1),
});

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

const DIRECTUS_ADMIN_TOKEN = process.env.DIRECTUS_ADMIN_TOKEN || '';

/**
 * GET /api/orders/[id]?tenant=slug
 * Fetch order status for the frontend. Requires tenant slug for verification.
 * Returns only safe fields (status, updated_at).
 */
export async function GET(
  request: NextRequest,
  context: { params: { id: string } | Promise<{ id: string }> }
) {
  const { id } = context.params instanceof Promise ? await context.params : context.params;
  const tenant = new URL(request.url).searchParams.get('tenant');

  if (!tenant) {
    return NextResponse.json(
      { success: false, error: 'Missing tenant parameter' },
      { status: 400 },
    );
  }

  try {
    const res = await fetch(
      `${DIRECTUS_URL}/items/orders?filter[id][_eq]=${id}&filter[tenant_id][_eq]=${encodeURIComponent(tenant)}&fields=id,status,updated_at&limit=1`,
      {
        headers: { 'Authorization': `Bearer ${DIRECTUS_ADMIN_TOKEN}` },
        cache: 'no-store',
      },
    );
    const data = await res.json();
    const order = (data.data || [])[0];

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      id: order.id,
      status: order.status,
      updatedAt: order.updated_at,
    });
  } catch (error) {
    console.error('[OrderGet] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch order' },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/orders/[id]
 * Updates order status. Verifies tenant ownership.
 * Sends Telegram notification to admin on status change.
 */
export async function PATCH(
  request: NextRequest,
  context: { params: { id: string } | Promise<{ id: string }> }
) {
  const { id } = context.params instanceof Promise ? await context.params : context.params;

  try {
    const body = await request.json();
    const validation = PatchOrderSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { status, tenantId } = validation.data;
    const directus = await getAdminClient();

    // Verify the order belongs to this tenant
    const orders = await directus.request(
      readItems('orders', {
        filter: { id: { _eq: id }, tenant_id: { _eq: tenantId } },
        limit: 1,
      })
    );

    if (!orders || orders.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    const order = orders[0] as Record<string, unknown>;
    await directus.request(updateItem('orders', id, { status }));

    // Send Telegram notification
    if (TELEGRAM_BOT_TOKEN && TELEGRAM_ADMIN_ID) {
      const statusEmoji: Record<string, string> = {
        confirmed: '✅',
        processing: '⚙️',
        shipped: '🚚',
        delivered: '📦',
        cancelled: '❌',
        pending: '⏳',
      };

      const text = [
        `${statusEmoji[status] || '📋'} <b>Order status updated</b>`,
        ``,
        `<b>ID:</b> <code>${id}</code>`,
        `<b>Customer:</b> ${order.customer_name}`,
        `<b>New status:</b> ${STATUS_LABELS[status]}`,
        `<b>Total:</b> $${Number(order.total).toFixed(2)}`,
      ].join('\n');

      fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: TELEGRAM_ADMIN_ID, text, parse_mode: 'HTML' }),
      }).catch(e => console.error('[OrderPatch] Telegram error:', e));
    }

    return NextResponse.json({ success: true, id, status });
  } catch (error) {
    console.error('[OrderPatch] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update order',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
