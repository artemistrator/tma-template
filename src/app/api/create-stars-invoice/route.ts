import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createDirectus, rest, readItem, createItem, authentication } from '@directus/sdk';

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

const CreateStarsInvoiceSchema = z.object({
  productId: z.string().min(1),
  tenantId: z.string().min(1),
  userId: z.number(),
  chatId: z.number(),
  customerName: z.string().min(2),
  customerEmail: z.string().email().optional(),
});

/**
 * POST /api/create-stars-invoice
 * Creates a Telegram Stars (XTR) invoice for a digital product.
 * Returns invoice link that can be opened via webApp.openInvoice().
 *
 * Setup required:
 *   - Bot must have Telegram Stars payments enabled via @BotFather
 *   - Set webhook: POST https://api.telegram.org/bot{TOKEN}/setWebhook?url={APP_URL}/api/telegram/webhook
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
    const validation = CreateStarsInvoiceSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { productId, tenantId, userId, customerName, customerEmail } = validation.data;
    const client = await getAdminClient();

    // Fetch product from Directus
    let product: Record<string, unknown>;
    try {
      product = await client.request(readItem('info_products', productId)) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
    }

    if (!product || product.status !== 'published' || product.tenant_id !== tenantId) {
      return NextResponse.json({ success: false, error: 'Product not available' }, { status: 404 });
    }

    const priceInStars = Math.max(1, Math.round(Number(product.price))); // 1 Star ≈ $0.013

    // Create pending order in Directus to track the payment
    const order = await client.request(
      createItem('orders', {
        tenant_id: tenantId,
        customer_name: customerName,
        customer_email: customerEmail || null,
        customer_phone: null,
        total: Number(product.price),
        status: 'pending',
        items: [{ id: productId, name: product.name, price: Number(product.price), quantity: 1 }],
        shipping_address: {},
        type: 'infobiz',
        product_id: productId,
        access_granted: false,
      })
    ) as Record<string, unknown>;

    const orderId = String(order.id);

    // Create Stars invoice via Telegram Bot API
    const invoicePayload = JSON.stringify({ orderId, productId, userId, tenantId });

    const tgRes = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/createInvoiceLink`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: String(product.name),
          description: String(product.description || product.name),
          payload: invoicePayload,
          currency: 'XTR', // Telegram Stars
          prices: [{ label: String(product.name), amount: priceInStars }],
        }),
      }
    );

    const tgData = await tgRes.json();

    if (!tgData.ok) {
      console.error('[StarsInvoice] Telegram error:', tgData);
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
    console.error('[StarsInvoice] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create invoice', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
