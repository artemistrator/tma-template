import { NextRequest, NextResponse } from 'next/server';

/**
 * Send Order Notification to Admin Telegram
 * 
 * This endpoint sends a message to the admin's Telegram chat
 * when a new order is placed.
 * 
 * Setup:
 * 1. Get your Telegram User ID: @userinfobot in Telegram
 * 2. Get Bot Token: from @BotFather
 * 3. Set environment variables:
 *    - TELEGRAM_ADMIN_ID: your user ID
 *    - TELEGRAM_BOT_TOKEN: your bot token
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { order, customer } = body;

    // Validate required fields
    if (!order || !customer) {
      return NextResponse.json(
        { error: 'Order and customer data are required' },
        { status: 400 }
      );
    }

    // Get credentials from environment
    const adminId = process.env.TELEGRAM_ADMIN_ID;
    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    // Skip if not configured (development mode)
    if (!adminId || !botToken) {
      console.log('Telegram notification skipped (not configured)');
      console.log('Order received:', order);
      
      return NextResponse.json({
        success: true,
        message: 'Order saved (Telegram notification not configured)',
        orderId: order.id,
      });
    }

    // Format order message for Telegram
    const itemsList = order.items
      .map((item: { name: string; quantity: number; price: number }) => `• ${item.name} x${item.quantity} - $${(item.price * item.quantity).toFixed(2)}`)
      .join('\n');

    const message = `
🛒 <b>New Order Received!</b>

<b>Order ID:</b> <code>${order.id}</code>
<b>Total:</b> $${order.total.toFixed(2)}

<b>Customer:</b>
• Name: ${customer.firstName || ''} ${customer.lastName || ''}
• Username: ${customer.username || 'N/A'}
• Phone: ${customer.phone || 'N/A'}
• Telegram ID: ${customer.id || 'N/A'}

<b>Shipping Address:</b>
${customer.address ? `• ${customer.address}` : ''}
${customer.city ? `• ${customer.city}, ${customer.zipCode || ''}` : ''}
${customer.country || ''}

<b>Items:</b>
${itemsList}

<b>Status:</b> ${order.status}
    `.trim();

    // Send message to Telegram
    const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
    
    const response = await fetch(telegramUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: adminId,
        text: message,
        parse_mode: 'HTML',
      }),
    });

    const result = await response.json();

    if (!response.ok || !result.ok) {
      throw new Error(result.description || 'Failed to send Telegram message');
    }

    console.log('Telegram notification sent successfully');

    return NextResponse.json({
      success: true,
      message: 'Order notification sent to admin',
      orderId: order.id,
      telegramMessageId: result.result.message_id,
    });
  } catch (error) {
    console.error('Admin notification error:', error);
    
    // Don't fail the request - order is still saved
    return NextResponse.json({
      success: false,
      message: 'Failed to send notification (order still saved)',
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 200 }); // 200 because order is still valid
  }
}
