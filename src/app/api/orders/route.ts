import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createDirectus, rest, createItems } from '@directus/sdk';

// Directus client
const DIRECTUS_URL = process.env.DIRECTUS_URL || process.env.NEXT_PUBLIC_DIRECTUS_URL || 'http://localhost:8055';
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
});

type CreateOrderInput = z.infer<typeof CreateOrderSchema>;

/**
 * POST /api/orders
 * Create a new order
 */
export async function POST(request: NextRequest) {
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
    };

    const result = await directus.request(
      createItems('orders', [orderData])
    );

    const orderId = (result as Record<string, unknown>[])?.[0]?.id;
    console.log('[Orders API] Order created:', orderId);

    // Send Telegram notification (non-blocking)
    if (TELEGRAM_BOT_TOKEN && TELEGRAM_ADMIN_ID) {
      sendTelegramNotification({
        orderId: String(orderId),
        tenantId: data.tenantId,
        customerName: data.customerName,
        phone: data.phone,
        total: data.total,
        items: data.items,
      }).catch(err => console.error('[Orders API] Telegram notification failed:', err));
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
 * Send Telegram notification to admin
 */
async function sendTelegramNotification(order: {
  orderId: string;
  tenantId: string;
  customerName: string;
  phone: string;
  total: number;
  items: Array<{ name: string; quantity: number; price: number }>;
}) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_ADMIN_ID) {
    throw new Error('Telegram credentials not configured');
  }

  const itemsList = order.items
    .map(item => `• ${item.name} x${item.quantity} - $${(item.price * item.quantity).toFixed(2)}`)
    .join('\n');

  const message = `
🎉 <b>New Order Received!</b>

<b>Order ID:</b> <code>${order.orderId}</code>
<b>Store:</b> ${order.tenantId}
<b>Total:</b> $${order.total.toFixed(2)}

<b>Customer:</b>
• Name: ${order.customerName}
• Phone: ${order.phone}

<b>Items:</b>
${itemsList}
  `.trim();

  const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  
  const response = await fetch(telegramUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      chat_id: TELEGRAM_ADMIN_ID,
      text: message,
      parse_mode: 'HTML',
    }),
  });

  const result = await response.json();
  
  if (!response.ok || !result.ok) {
    throw new Error(result.description || 'Failed to send Telegram message');
  }

  console.log('[Orders API] Telegram notification sent successfully');
  return result;
}
