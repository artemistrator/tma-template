import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createDirectus, rest, createItems } from '@directus/sdk';
import { createRateLimiter } from '@/lib/rate-limit';
import { alertApiError } from '@/lib/monitoring/alerts';

const limiter = createRateLimiter({ limit: 10, windowMs: 60_000, prefix: 'orders' });

const DIRECTUS_URL = process.env.DIRECTUS_URL || process.env.NEXT_PUBLIC_DIRECTUS_URL || 'http://localhost:8055';
const DIRECTUS_ADMIN_TOKEN = process.env.DIRECTUS_ADMIN_TOKEN || '';

// Public client for creating orders
const directus = createDirectus(DIRECTUS_URL).with(rest());

// Telegram config
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_ADMIN_ID = process.env.TELEGRAM_ADMIN_ID;

// Validation schema
const CreateOrderSchema = z.object({
  tenantId: z.string().min(1, 'Tenant ID is required'),
  customerName: z.string().min(2, 'Customer name must be at least 2 characters'),
  phone: z.string().min(10, 'Please enter a valid phone number'),
  email: z.string().email().optional().or(z.literal('')),
  items: z.array(z.object({
    id: z.string(),
    name: z.string(),
    price: z.number(),
    quantity: z.number().min(1),
  })).min(1, 'Order must have at least one item'),
  total: z.number().positive('Total must be positive'),
  address: z.object({
    address: z.string().optional(),
    city: z.string().optional(),
    zipCode: z.string().optional(),
    country: z.string().optional(),
  }).optional(),
  promoCode: z.string().optional(),
  discountAmount: z.number().optional(),
  paymentMethod: z.string().optional(),
  deliveryMethod: z.string().optional(),
  deliveryPrice: z.number().optional(),
  deliveryInfo: z.record(z.unknown()).optional(),
});

type CreateOrderInput = z.infer<typeof CreateOrderSchema>;

/**
 * POST /api/orders
 * Create a new order
 */
export async function POST(request: NextRequest) {
  const blocked = limiter.check(request);
  if (blocked) return blocked;

  try {
    const body = await request.json();

    // Validate request body
    const validation = CreateOrderSchema.safeParse(body);
    if (!validation.success) {
      console.error('[Orders API] Validation failed:', validation.error.issues);
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validation.error.issues,
        },
        { status: 400 }
      );
    }

    const data: CreateOrderInput = validation.data;
    console.log('[Orders API] Creating order:', {
      tenantId: data.tenantId,
      customerName: data.customerName,
      total: data.total,
      itemCount: data.items.length,
    });

    // Validate stock before creating order
    const stockError = await validateAndDecrementStock(data.items);
    if (stockError) {
      return NextResponse.json(
        { success: false, error: stockError.message, outOfStock: stockError.items },
        { status: 409 },
      );
    }

    // Create order in Directus
    const orderData = {
      tenant_id: data.tenantId,
      customer_name: data.customerName,
      customer_phone: data.phone,
      customer_email: data.email || null,
      total: data.total,
      status: 'pending',
      items: data.items,
      shipping_address: data.address || {},
      promo_code: data.promoCode || null,
      discount_amount: data.discountAmount || null,
      payment_method: data.paymentMethod || null,
      delivery_method: data.deliveryMethod || null,
      delivery_price: data.deliveryPrice || null,
      delivery_info: data.deliveryInfo || null,
    };

    const result = await directus.request(
      createItems('orders', [orderData])
    );

    const orderId = (result as Record<string, unknown>[])?.[0]?.id;
    console.log('[Orders API] Order created:', orderId);

    // Send Telegram notification (non-blocking)
    // Notify both the global admin and tenant-specific admins
    if (TELEGRAM_BOT_TOKEN) {
      const notificationData = {
        orderId: String(orderId),
        tenantId: data.tenantId,
        customerName: data.customerName,
        phone: data.phone,
        total: data.total,
        items: data.items,
      };

      // Global admin notification
      if (TELEGRAM_ADMIN_ID) {
        sendTelegramNotification(notificationData, TELEGRAM_ADMIN_ID)
          .catch(err => console.error('[Orders API] Global notification failed:', err));
      }

      // Per-tenant admin notifications
      notifyTenantAdmins(notificationData)
        .catch(err => console.error('[Orders API] Tenant notification failed:', err));
    } else {
      console.log('[Orders API] Telegram notification skipped (not configured)');
    }

    return NextResponse.json({
      success: true,
      orderId: String(orderId),
      message: 'Order created successfully',
    });
  } catch (error) {
    console.error('[Orders API] Error:', error);
    alertApiError('/api/orders', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create order',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Validate stock availability and decrement atomically before order creation.
 * Returns null on success, or { message, items } describing what's out of stock.
 */
async function validateAndDecrementStock(
  items: Array<{ id: string; name: string; quantity: number }>,
): Promise<{ message: string; items: Array<{ id: string; name: string; requested: number; available: number }> } | null> {
  if (!DIRECTUS_ADMIN_TOKEN) return null; // No token = skip validation

  const outOfStock: Array<{ id: string; name: string; requested: number; available: number }> = [];
  const toDecrement: Array<{ id: string; currentStock: number; newStock: number }> = [];

  // Phase 1: Check all items
  for (const item of items) {
    try {
      const res = await fetch(
        `${DIRECTUS_URL}/items/products/${item.id}?fields=stock_quantity`,
        { headers: { Authorization: `Bearer ${DIRECTUS_ADMIN_TOKEN}` }, cache: 'no-store' },
      );
      const data = await res.json();
      const currentStock = data.data?.stock_quantity as number | null | undefined;

      // Unlimited (-1) or null — skip
      if (currentStock == null || currentStock < 0) continue;

      if (currentStock < item.quantity) {
        outOfStock.push({ id: item.id, name: item.name, requested: item.quantity, available: currentStock });
      } else {
        toDecrement.push({ id: item.id, currentStock, newStock: currentStock - item.quantity });
      }
    } catch (e) {
      console.warn(`[Orders API] Stock check failed for ${item.id}:`, e);
      // Don't block order if stock check fails
    }
  }

  if (outOfStock.length > 0) {
    const names = outOfStock.map(i => `"${i.name}" (available: ${i.available}, requested: ${i.requested})`).join(', ');
    return { message: `Not enough stock: ${names}`, items: outOfStock };
  }

  // Phase 2: Decrement all (only after all checks pass)
  for (const item of toDecrement) {
    try {
      await fetch(`${DIRECTUS_URL}/items/products/${item.id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${DIRECTUS_ADMIN_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock_quantity: item.newStock }),
      });
      console.log(`[Orders API] Stock: product ${item.id} ${item.currentStock} → ${item.newStock}`);
    } catch (e) {
      console.warn(`[Orders API] Stock decrement failed for ${item.id}:`, e);
    }
  }

  return null;
}

/**
 * Send Telegram notification to a specific chat ID
 */
async function sendTelegramNotification(
  order: {
    orderId: string;
    tenantId: string;
    customerName: string;
    phone: string;
    total: number;
    items: Array<{ name: string; quantity: number; price: number }>;
  },
  chatId: string | number,
) {
  if (!TELEGRAM_BOT_TOKEN) {
    throw new Error('Telegram bot token not configured');
  }

  const itemsList = order.items
    .map(item => `\u2022 ${item.name} x${item.quantity} - ${(item.price * item.quantity).toLocaleString()}`)
    .join('\n');

  const message = `
\ud83c\udf89 <b>New Order!</b>

<b>Order ID:</b> <code>${order.orderId}</code>
<b>Store:</b> ${order.tenantId}
<b>Total:</b> ${order.total.toLocaleString()}

<b>Customer:</b>
\u2022 ${order.customerName}
\u2022 ${order.phone}

<b>Items:</b>
${itemsList}
  `.trim();

  const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
      parse_mode: 'HTML',
    }),
  });

  const result = await response.json();
  if (!response.ok || !result.ok) {
    throw new Error(result.description || 'Failed to send Telegram message');
  }

  console.log(`[Orders API] Telegram notification sent to ${chatId}`);
  return result;
}

/**
 * Notify all tenant admins about a new order
 */
async function notifyTenantAdmins(order: {
  orderId: string;
  tenantId: string;
  customerName: string;
  phone: string;
  total: number;
  items: Array<{ name: string; quantity: number; price: number }>;
}) {
  if (!DIRECTUS_ADMIN_TOKEN || !TELEGRAM_BOT_TOKEN) return;

  try {
    // Fetch all admins for this tenant
    const res = await fetch(
      `${DIRECTUS_URL}/items/tenant_admins?filter[tenant_id][_eq]=${encodeURIComponent(order.tenantId)}&fields=telegram_id`,
      {
        headers: { Authorization: `Bearer ${DIRECTUS_ADMIN_TOKEN}` },
        cache: 'no-store',
      },
    );
    const data = await res.json();
    const admins = (data.data || []) as Array<{ telegram_id: number }>;

    for (const admin of admins) {
      // Skip if same as global admin (already notified)
      if (String(admin.telegram_id) === TELEGRAM_ADMIN_ID) continue;

      sendTelegramNotification(order, admin.telegram_id).catch(err =>
        console.warn(`[Orders API] Failed to notify tenant admin ${admin.telegram_id}:`, err),
      );
    }
  } catch (err) {
    console.warn('[Orders API] Failed to fetch tenant admins:', err);
  }
}
