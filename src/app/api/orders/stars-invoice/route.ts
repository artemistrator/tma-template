import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createDirectus, rest, createItem, authentication } from '@directus/sdk';

const DIRECTUS_URL = process.env.DIRECTUS_URL || process.env.NEXT_PUBLIC_DIRECTUS_URL || 'http://localhost:8055';
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

async function getAdminClient() {
  const email = process.env.DIRECTUS_ADMIN_EMAIL;
  const password = process.env.DIRECTUS_ADMIN_PASSWORD;
  if (!email || !password) return createDirectus(DIRECTUS_URL).with(rest());
  const client = createDirectus(DIRECTUS_URL).with(authentication('json')).with(rest());
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (client as any).login(email, password);
  return client;
}

const CreateCartStarsInvoiceSchema = z.object({
  tenantId: z.string().min(1),
  userId: z.number(),
  chatId: z.number(),
  customerName: z.string().min(2),
  customerPhone: z.string().min(10),
  items: z.array(z.object({
    id: z.string(),
    name: z.string(),
    price: z.number(),
    quantity: z.number().min(1),
  })).min(1),
  total: z.number().positive(),
  address: z.object({
    address: z.string().optional(),
    city: z.string().optional(),
    zipCode: z.string().optional(),
    country: z.string().optional(),
  }).optional(),
});

/**
 * POST /api/orders/stars-invoice
 * Creates a Telegram Stars (XTR) invoice for an ecommerce cart.
 * Returns invoice link opened via webApp.openInvoice().
 */
export async function POST(request: NextRequest) {
  try {
    if (!TELEGRAM_BOT_TOKEN) {
      return NextResponse.json(
        { success: false, error: 'Telegram bot not configured' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const validation = CreateCartStarsInvoiceSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { tenantId, userId, customerName, customerPhone, items, total, address } = validation.data;
    const client = await getAdminClient();

    // 1 Star ≈ $0.013 — round total USD → Stars (min 1)
    const priceInStars = Math.max(1, Math.round(total));

    // Create pending order in Directus
    const order = await client.request(
      createItem('orders', {
        tenant_id: tenantId,
        customer_name: customerName,
        customer_phone: customerPhone,
        total,
        status: 'pending',
        items: items.map(i => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity })),
        shipping_address: address || {},
        payment_method: 'stars',
      })
    ) as Record<string, unknown>;

    const orderId = String(order.id);

    // Build description from items
    const itemsDesc = items.map(i => `${i.name} x${i.quantity}`).join(', ');

    // Create Stars invoice via Telegram Bot API
    const invoicePayload = JSON.stringify({ orderId, userId, tenantId, type: 'ecommerce' });

    const tgRes = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/createInvoiceLink`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Order payment',
          description: itemsDesc.slice(0, 255),
          payload: invoicePayload,
          currency: 'XTR',
          prices: [{ label: 'Order total', amount: priceInStars }],
        }),
      }
    );

    const tgData = await tgRes.json();

    if (!tgData.ok) {
      console.error('[CartStarsInvoice] Telegram error:', tgData);
      return NextResponse.json(
        { success: false, error: tgData.description || 'Failed to create invoice' },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      invoiceUrl: tgData.result,
      orderId,
      priceInStars,
    });
  } catch (error) {
    console.error('[CartStarsInvoice] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create invoice', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
