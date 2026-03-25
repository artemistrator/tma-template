import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createRateLimiter } from '@/lib/rate-limit';
import { createYooKassaClient, type PaymentMethod } from '@/lib/payments/yookassa';
import { decryptConfigSecrets } from '@/lib/crypto';
import { alertApiError } from '@/lib/monitoring/alerts';
import { buildTenantUrl } from '@/lib/tenant';

const limiter = createRateLimiter({ limit: 10, windowMs: 60_000, prefix: 'pay-create' });

const DIRECTUS_URL = process.env.DIRECTUS_URL || process.env.NEXT_PUBLIC_DIRECTUS_URL || 'http://localhost:8055';
const DIRECTUS_TOKEN = process.env.DIRECTUS_ADMIN_TOKEN || '';

const CreatePaymentSchema = z.object({
  orderId: z.string().min(1),
  tenantSlug: z.string().min(1),
  method: z.enum(['yookassa', 'stars', 'cash'] as const),
  /** Required for yookassa — URL to redirect after payment */
  returnUrl: z.string().url().optional(),
});

/**
 * POST /api/payments/create
 *
 * Routes payment creation by method:
 * - yookassa: creates YooKassa payment, returns confirmation_url
 * - stars: returns redirect to existing stars-invoice endpoint
 * - cash: marks order as "awaiting cash payment", returns success
 */
export async function POST(request: NextRequest) {
  const blocked = limiter.check(request);
  if (blocked) return blocked;

  try {
    const body = await request.json();
    const validation = CreatePaymentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: validation.error.issues },
        { status: 400 },
      );
    }

    const { orderId, tenantSlug, method, returnUrl } = validation.data;

    // Fetch order to get amount
    const orderRes = await fetch(
      `${DIRECTUS_URL}/items/orders/${orderId}?fields=id,total,tenant_id,status,customer_name`,
      {
        headers: { Authorization: `Bearer ${DIRECTUS_TOKEN}` },
        cache: 'no-store',
      },
    );
    const orderData = await orderRes.json();
    const order = orderData.data;

    if (!order) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }

    if (order.tenant_id !== tenantSlug) {
      return NextResponse.json({ success: false, error: 'Order does not belong to tenant' }, { status: 403 });
    }

    // Route by payment method
    const result = await processPayment(method, {
      orderId,
      tenantSlug,
      amount: Number(order.total),
      description: `Order #${orderId}`,
      returnUrl: returnUrl || buildTenantUrl(tenantSlug, '/?page=order-success'),
    });

    // Update order with payment method and payment ID
    await fetch(`${DIRECTUS_URL}/items/orders/${orderId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${DIRECTUS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        payment_method: method,
        payment_id: result.paymentId || null,
        payment_status: result.paymentStatus,
      }),
    });

    return NextResponse.json({
      success: true,
      method,
      paymentId: result.paymentId,
      confirmationUrl: result.confirmationUrl,
      paymentStatus: result.paymentStatus,
      testMode: result.testMode,
    });
  } catch (error) {
    console.error('[Payments] Create error:', error);
    alertApiError('/api/payments/create', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create payment', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}

interface PaymentResult {
  paymentId?: string;
  confirmationUrl?: string;
  paymentStatus: string;
  testMode: boolean;
}

async function processPayment(
  method: PaymentMethod,
  params: {
    orderId: string;
    tenantSlug: string;
    amount: number;
    description: string;
    returnUrl: string;
  },
): Promise<PaymentResult> {
  switch (method) {
    case 'yookassa': {
      // Get tenant payment config
      const tenantConfig = await getTenantPaymentConfig(params.tenantSlug);
      const client = createYooKassaClient(tenantConfig?.yookassa);

      const payment = await client.createPayment({
        amount: params.amount,
        currency: tenantConfig?.yookassa?.shopId ? 'RUB' : 'RUB', // Default RUB for YooKassa
        description: params.description,
        orderId: params.orderId,
        tenantSlug: params.tenantSlug,
        returnUrl: params.returnUrl,
      });

      console.log(`[Payments] YooKassa payment created: ${payment.id} (test: ${payment.test})`);

      return {
        paymentId: payment.id,
        confirmationUrl: payment.confirmation?.confirmation_url,
        paymentStatus: payment.status,
        testMode: payment.test,
      };
    }

    case 'cash': {
      // Cash on delivery — no external payment needed
      console.log(`[Payments] Cash payment for order ${params.orderId}`);
      return {
        paymentStatus: 'cash_on_delivery',
        testMode: false,
      };
    }

    case 'stars': {
      // Stars payments are handled by the existing /api/orders/stars-invoice endpoint
      // This is a routing fallback — frontend should call stars-invoice directly
      return {
        paymentStatus: 'redirect_to_stars',
        testMode: false,
      };
    }

    default:
      throw new Error(`Unknown payment method: ${method}`);
  }
}

async function getTenantPaymentConfig(tenantSlug: string) {
  try {
    const res = await fetch(
      `${DIRECTUS_URL}/items/tenants?filter[slug][_eq]=${encodeURIComponent(tenantSlug)}&fields=config&limit=1`,
      {
        headers: { Authorization: `Bearer ${DIRECTUS_TOKEN}` },
        cache: 'no-store',
      },
    );
    const data = await res.json();
    const config = data.data?.[0]?.config;
    if (!config?.payments) return null;
    // Decrypt secrets (YooKassa secretKey) before using
    const decrypted = decryptConfigSecrets(config);
    return decrypted.payments || null;
  } catch {
    return null;
  }
}
