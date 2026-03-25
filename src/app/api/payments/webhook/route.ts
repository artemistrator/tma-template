import { NextRequest, NextResponse } from 'next/server';
import { createYooKassaClient, type WebhookEvent } from '@/lib/payments/yookassa';
import { alertPaymentFailed, alertApiError } from '@/lib/monitoring/alerts';

const DIRECTUS_URL = process.env.DIRECTUS_URL || process.env.NEXT_PUBLIC_DIRECTUS_URL || 'http://localhost:8055';
const DIRECTUS_TOKEN = process.env.DIRECTUS_ADMIN_TOKEN || '';
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

/**
 * POST /api/payments/webhook
 *
 * Receives payment notifications from YooKassa.
 * Updates order status in Directus based on payment result.
 *
 * YooKassa sends:
 * - payment.succeeded → order confirmed
 * - payment.canceled → order payment failed
 * - payment.waiting_for_capture → (auto-capture enabled, shouldn't happen)
 * - refund.succeeded → order refunded
 *
 * Security: validates source IP against YooKassa whitelist.
 * In testMode: accepts all IPs.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    let event: WebhookEvent;

    try {
      event = JSON.parse(body);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    // Validate source IP
    const sourceIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '';
    const client = createYooKassaClient(); // testMode by default
    if (!client.validateWebhook(sourceIp)) {
      console.warn(`[Payments Webhook] Rejected from IP: ${sourceIp}`);
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const payment = event.object;
    if (!payment?.id || !payment?.metadata) {
      console.warn('[Payments Webhook] Missing payment data');
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const orderId = payment.metadata.order_id;
    const tenantSlug = payment.metadata.tenant_slug;

    console.log(`[Payments Webhook] ${event.event}: payment=${payment.id}, order=${orderId}, tenant=${tenantSlug}`);

    // Map YooKassa event to order status
    let orderStatus: string;
    let paymentStatus: string;

    switch (event.event) {
      case 'payment.succeeded':
        orderStatus = 'confirmed';
        paymentStatus = 'paid';
        break;
      case 'payment.canceled':
        orderStatus = 'cancelled';
        paymentStatus = 'failed';
        // Alert admin about payment failure
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        alertPaymentFailed(
          orderId || payment.id,
          tenantSlug || 'unknown',
          ((payment as any).cancellation_details?.reason as string) || 'canceled',
          `${payment.amount.value} ${payment.amount.currency}`,
        );
        break;
      case 'payment.waiting_for_capture':
        orderStatus = 'pending';
        paymentStatus = 'waiting_for_capture';
        break;
      case 'refund.succeeded':
        orderStatus = 'cancelled';
        paymentStatus = 'refunded';
        alertPaymentFailed(
          orderId || payment.id,
          tenantSlug || 'unknown',
          'refund completed',
          payment.amount ? `${payment.amount.value} ${payment.amount.currency}` : undefined,
        );
        break;
      default:
        console.warn(`[Payments Webhook] Unknown event: ${event.event}`);
        return NextResponse.json({ received: true });
    }

    // Update order in Directus
    if (orderId) {
      await fetch(`${DIRECTUS_URL}/items/orders/${orderId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${DIRECTUS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: orderStatus,
          payment_status: paymentStatus,
          payment_id: payment.id,
        }),
      });

      console.log(`[Payments Webhook] Order ${orderId} updated: status=${orderStatus}, payment=${paymentStatus}`);

      // Notify tenant admins about payment
      if (event.event === 'payment.succeeded' && TELEGRAM_BOT_TOKEN && tenantSlug) {
        notifyPaymentReceived(orderId, tenantSlug, payment.amount).catch(err =>
          console.warn('[Payments Webhook] Notification failed:', err),
        );
      }
    }

    // YooKassa expects 200 OK to confirm receipt
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[Payments Webhook] Error:', error);
    alertApiError('/api/payments/webhook', error);
    // Still return 200 to prevent YooKassa from retrying endlessly
    return NextResponse.json({ received: true, error: 'Internal processing error' });
  }
}

/**
 * Notify tenant admins about successful payment via Telegram.
 */
async function notifyPaymentReceived(
  orderId: string,
  tenantSlug: string,
  amount: { value: string; currency: string },
) {
  if (!TELEGRAM_BOT_TOKEN || !DIRECTUS_TOKEN) return;

  // Fetch tenant admins
  const res = await fetch(
    `${DIRECTUS_URL}/items/tenant_admins?filter[tenant_id][_eq]=${encodeURIComponent(tenantSlug)}&fields=telegram_id`,
    {
      headers: { Authorization: `Bearer ${DIRECTUS_TOKEN}` },
      cache: 'no-store',
    },
  );
  const data = await res.json();
  const admins = (data.data || []) as Array<{ telegram_id: number }>;

  const message = [
    `\u2705 <b>Payment received!</b>`,
    ``,
    `<b>Order:</b> <code>${orderId}</code>`,
    `<b>Amount:</b> ${amount.value} ${amount.currency}`,
    `<b>Store:</b> ${tenantSlug}`,
  ].join('\n');

  for (const admin of admins) {
    fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: admin.telegram_id,
        text: message,
        parse_mode: 'HTML',
      }),
    }).catch(() => {});
  }

  // Also notify global admin
  const globalAdminId = process.env.TELEGRAM_ADMIN_ID;
  if (globalAdminId) {
    fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: globalAdminId,
        text: message,
        parse_mode: 'HTML',
      }),
    }).catch(() => {});
  }
}
