import { NextRequest, NextResponse } from 'next/server';
import { createDirectus, rest, readItem, updateItem, authentication } from '@directus/sdk';

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

async function sendTelegramMessage(chatId: number | string, text: string) {
  if (!TELEGRAM_BOT_TOKEN) return;
  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  });
}

/**
 * POST /api/telegram/webhook
 * Telegram bot webhook handler for:
 *   - pre_checkout_query: validate Stars payment before Telegram charges user
 *   - successful_payment: grant access to digital product
 *
 * Setup:
 *   POST https://api.telegram.org/bot{TOKEN}/setWebhook?url={APP_URL}/api/telegram/webhook
 */
export async function POST(request: NextRequest) {
  try {
    if (!TELEGRAM_BOT_TOKEN) {
      return NextResponse.json({ ok: true }); // ack without processing
    }

    const update = await request.json();
    console.log('[Webhook] Update type:', Object.keys(update).filter(k => k !== 'update_id'));

    // ── pre_checkout_query ───────────────────────────────────────────────────
    if (update.pre_checkout_query) {
      const query = update.pre_checkout_query;
      console.log('[Webhook] pre_checkout_query:', query.id);

      // Validate order payload
      let isValid = false;
      try {
        const payload = JSON.parse(query.payload);
        if (payload.orderId && payload.productId) {
          isValid = true;
        }
      } catch {
        isValid = false;
      }

      // Must respond within 10 seconds
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerPreCheckoutQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pre_checkout_query_id: query.id,
          ok: isValid,
          error_message: isValid ? undefined : 'Order not found or expired.',
        }),
      });

      return NextResponse.json({ ok: true });
    }

    // ── successful_payment ──────────────────────────────────────────────────
    if (update.message?.successful_payment) {
      const payment = update.message.successful_payment;
      const userId = update.message.from?.id;
      console.log('[Webhook] successful_payment, payload:', payment.invoice_payload);

      let payload: { orderId?: string; productId?: string; userId?: number; tenantId?: string } = {};
      try {
        payload = JSON.parse(payment.invoice_payload);
      } catch {
        console.error('[Webhook] Invalid payload');
        return NextResponse.json({ ok: true });
      }

      const { orderId, productId, tenantId } = payload;
      if (!orderId || !productId) {
        console.error('[Webhook] Missing orderId or productId');
        return NextResponse.json({ ok: true });
      }

      const client = await getAdminClient();

      // Mark order as confirmed + access_granted
      try {
        await client.request(updateItem('orders', orderId, {
          status: 'confirmed',
          access_granted: true,
        }));
        console.log('[Webhook] Order confirmed:', orderId);
      } catch (e) {
        console.error('[Webhook] Could not update order:', e);
      }

      // Fetch product to deliver content
      let product: Record<string, unknown> | null = null;
      try {
        product = await client.request(readItem('info_products', productId)) as Record<string, unknown>;
      } catch (e) {
        console.error('[Webhook] Could not fetch product:', e);
      }

      // Deliver content to user
      if (userId) {
        let deliveryText = `✅ <b>Payment received!</b>\n\nThank you for your purchase.\n\n`;

        if (product) {
          deliveryText += `<b>${product.name}</b>\n`;

          if (product.type === 'pdf' && product.file_id) {
            const fileUrl = `${DIRECTUS_URL}/assets/${product.file_id}`;
            deliveryText += `\nYour PDF is ready to download:\n${fileUrl}`;
          } else if (product.type === 'course' && product.external_url) {
            deliveryText += `\nAccess your course here:\n${product.external_url}`;
          } else if (product.type === 'article') {
            deliveryText += `\nYour article is available in the app. Open the mini app to read it.`;
          } else if (product.type === 'consultation') {
            deliveryText += `\nWe'll contact you shortly to schedule your session.`;
          }
        }

        deliveryText += `\n\n<i>Order ID: ${orderId}</i>`;

        await sendTelegramMessage(userId, deliveryText);
      }

      // Notify admin
      const adminId = process.env.TELEGRAM_ADMIN_ID;
      if (adminId) {
        const adminText = [
          `⭐ <b>Stars payment received!</b>`,
          ``,
          `<b>Product:</b> ${product?.name || productId}`,
          `<b>Amount:</b> ${payment.total_amount} Stars`,
          `<b>Order ID:</b> <code>${orderId}</code>`,
          `<b>Tenant:</b> ${tenantId}`,
        ].join('\n');
        await sendTelegramMessage(adminId, adminText);
      }

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[Webhook] Error:', error);
    // Always return 200 to Telegram to avoid retries
    return NextResponse.json({ ok: true });
  }
}
