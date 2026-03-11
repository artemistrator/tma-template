import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
   const { orderId, total, items, customerName, customerPhone, shippingAddress } = await request.json();

   const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
   const telegramAdminId = process.env.TELEGRAM_ADMIN_ID;

    if (!telegramBotToken || !telegramAdminId) {
     console.error('Telegram credentials not configured');
     return NextResponse.json(
        { error: 'Telegram notification not configured' },
        { status: 500 }
      );
    }

    // Format order details
   const itemsList = items
      .map((item: { name: string; quantity: number; price: number }) => `• ${item.name} x${item.quantity} - $${(item.price * item.quantity).toFixed(2)}`)
      .join('\n');

   const message = `
🛒 **New Order Received!**

**Order ID:** ${orderId}
**Customer:** ${customerName}
**Phone:** ${customerPhone}
**Total:** $${total.toFixed(2)}

**Items:**
${itemsList}

**Shipping Address:**
${shippingAddress.address}
${shippingAddress.city ? shippingAddress.city + ', ' : ''}${shippingAddress.zipCode ? shippingAddress.zipCode + ', ' : ''}${shippingAddress.country || ''}

**Time:** ${new Date().toLocaleString('en-US', {
     timeZone: 'America/New_York',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })}
    `.trim();

    // Send to Telegram
   const telegramUrl = `https://api.telegram.org/bot${telegramBotToken}/sendMessage`;
    
   const response = await fetch(telegramUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: telegramAdminId,
        text: message,
        parse_mode: 'Markdown',
      }),
    });

   const result = await response.json();

    if (!result.ok) {
     console.error('Telegram API error:', result);
     return NextResponse.json(
        { error: 'Failed to send Telegram notification', details: result },
        { status: 500 }
      );
    }

   console.log('Telegram notification sent successfully:', orderId);
   return NextResponse.json({ success: true, messageId: result.result.message_id });
  } catch (error) {
   console.error('Error sending Telegram notification:', error);
   return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message: error },
      { status: 500 }
    );
  }
}
