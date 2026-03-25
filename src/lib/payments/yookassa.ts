/**
 * YooKassa Payment Client (Stub)
 *
 * Full interface ready for real integration.
 * In testMode (or when no credentials): returns mock data.
 *
 * Real API: https://yookassa.ru/developers/api
 * Auth: Basic (shopId:secretKey)
 * Base URL: https://api.yookassa.ru/v3
 */

export interface YooKassaConfig {
  shopId: string;
  secretKey: string;
  testMode?: boolean;
}

export interface CreatePaymentParams {
  /** Amount in currency units (e.g. 1500.00 for 1500 RUB) */
  amount: number;
  /** ISO 4217 currency code */
  currency: string;
  /** Payment description shown to customer */
  description: string;
  /** Internal order ID for reconciliation */
  orderId: string;
  /** Tenant slug */
  tenantSlug: string;
  /** URL to redirect customer after payment */
  returnUrl: string;
  /** Additional metadata stored with payment */
  metadata?: Record<string, string>;
}

export interface YooKassaPayment {
  id: string;
  status: 'pending' | 'waiting_for_capture' | 'succeeded' | 'canceled';
  amount: { value: string; currency: string };
  description: string;
  confirmation?: { type: string; confirmation_url: string };
  metadata?: Record<string, string>;
  created_at: string;
  test: boolean;
}

export interface WebhookEvent {
  type: 'notification';
  event: 'payment.succeeded' | 'payment.canceled' | 'payment.waiting_for_capture' | 'refund.succeeded';
  object: YooKassaPayment;
}

const YOOKASSA_API = 'https://api.yookassa.ru/v3';

export class YooKassaClient {
  private shopId: string;
  private secretKey: string;
  private testMode: boolean;

  constructor(config: YooKassaConfig) {
    this.shopId = config.shopId;
    this.secretKey = config.secretKey;
    this.testMode = config.testMode ?? true;
  }

  /**
   * Create a payment.
   * In testMode: returns a mock payment with a fake confirmation URL.
   * In production: calls YooKassa API.
   */
  async createPayment(params: CreatePaymentParams): Promise<YooKassaPayment> {
    if (this.testMode || !this.shopId || !this.secretKey) {
      return this.mockCreatePayment(params);
    }

    // Real YooKassa API call
    const idempotencyKey = crypto.randomUUID();
    const body = {
      amount: {
        value: params.amount.toFixed(2),
        currency: params.currency,
      },
      confirmation: {
        type: 'redirect',
        return_url: params.returnUrl,
      },
      capture: true,
      description: params.description,
      metadata: {
        order_id: params.orderId,
        tenant_slug: params.tenantSlug,
        ...params.metadata,
      },
    };

    const res = await fetch(`${YOOKASSA_API}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotence-Key': idempotencyKey,
        'Authorization': `Basic ${Buffer.from(`${this.shopId}:${this.secretKey}`).toString('base64')}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`YooKassa API error ${res.status}: ${JSON.stringify(err)}`);
    }

    return res.json();
  }

  /**
   * Get payment status by ID.
   */
  async getPayment(paymentId: string): Promise<YooKassaPayment> {
    if (this.testMode || !this.shopId || !this.secretKey) {
      return this.mockGetPayment(paymentId);
    }

    const res = await fetch(`${YOOKASSA_API}/payments/${paymentId}`, {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${this.shopId}:${this.secretKey}`).toString('base64')}`,
      },
    });

    if (!res.ok) {
      throw new Error(`YooKassa API error ${res.status}`);
    }

    return res.json();
  }

  /**
   * Validate webhook notification.
   * YooKassa sends notifications with IP whitelist — no HMAC signature.
   * In production, verify source IP is from YooKassa range.
   *
   * YooKassa IPs: https://yookassa.ru/developers/using-api/webhooks#ip
   */
  validateWebhook(sourceIp: string): boolean {
    if (this.testMode) return true;

    // YooKassa notification IP ranges
    const allowedRanges = [
      '185.71.76.',
      '185.71.77.',
      '77.75.153.',
      '77.75.156.',
      '77.75.157.',
      '77.75.158.',
      '77.75.159.',
      '2a02:5180:',
    ];

    return allowedRanges.some(prefix => sourceIp.startsWith(prefix));
  }

  // --- Mock implementations for testMode ---

  private mockCreatePayment(params: CreatePaymentParams): YooKassaPayment {
    const id = `test_${crypto.randomUUID().slice(0, 8)}`;
    console.log(`[YooKassa Mock] Creating test payment: ${id} for ${params.amount} ${params.currency}`);

    return {
      id,
      status: 'pending',
      amount: { value: params.amount.toFixed(2), currency: params.currency },
      description: params.description,
      confirmation: {
        type: 'redirect',
        // In test mode, redirect back to the return URL with mock params
        confirmation_url: `${params.returnUrl}?payment_id=${id}&test=true`,
      },
      metadata: {
        order_id: params.orderId,
        tenant_slug: params.tenantSlug,
        ...params.metadata,
      },
      created_at: new Date().toISOString(),
      test: true,
    };
  }

  private mockGetPayment(paymentId: string): YooKassaPayment {
    // In test mode, all payments are "succeeded" after creation
    return {
      id: paymentId,
      status: 'succeeded',
      amount: { value: '0.00', currency: 'RUB' },
      description: 'Test payment',
      metadata: {},
      created_at: new Date().toISOString(),
      test: true,
    };
  }
}

/**
 * Create a YooKassa client from tenant config.
 * Returns client in testMode if no credentials provided.
 */
export function createYooKassaClient(tenantPaymentConfig?: {
  shopId?: string;
  secretKey?: string;
  testMode?: boolean;
}): YooKassaClient {
  return new YooKassaClient({
    shopId: tenantPaymentConfig?.shopId || '',
    secretKey: tenantPaymentConfig?.secretKey || '',
    testMode: tenantPaymentConfig?.testMode ?? true,
  });
}

/** Payment methods supported by the platform */
export type PaymentMethod = 'yookassa' | 'stars' | 'cash';

/** Payment config stored in tenant.config.payments */
export interface TenantPaymentConfig {
  yookassa?: {
    shopId: string;
    secretKey: string;
    testMode: boolean;
  };
  /** Enabled payment methods */
  methods: PaymentMethod[];
}
