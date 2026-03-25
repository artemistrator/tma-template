import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createDirectus, rest, readItems, updateItem, authentication } from '@directus/sdk';

const DIRECTUS_URL = process.env.DIRECTUS_URL || process.env.NEXT_PUBLIC_DIRECTUS_URL || 'http://localhost:8055';
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_ADMIN_ID = process.env.TELEGRAM_ADMIN_ID;

async function getDirectusClient() {
  const adminEmail = process.env.DIRECTUS_ADMIN_EMAIL;
  const adminPassword = process.env.DIRECTUS_ADMIN_PASSWORD;

  if (adminEmail && adminPassword) {
    const client = createDirectus(DIRECTUS_URL)
      .with(authentication('json'))
      .with(rest());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (client as any).login(adminEmail, adminPassword);
    return client;
  }

  return createDirectus(DIRECTUS_URL).with(rest());
}

const PatchBookingSchema = z.object({
  status: z.enum(['cancelled', 'confirmed', 'pending']),
  tenantId: z.string().min(1),
});

/**
 * PATCH /api/bookings/[id]
 * Updates booking status. Verifies tenant ownership.
 */
export async function PATCH(
  request: NextRequest,
  context: { params: { id: string } | Promise<{ id: string }> }
) {
  const resolvedParams = context.params instanceof Promise ? await context.params : context.params;
  const { id } = resolvedParams;

  try {
    const body = await request.json();
    const validation = PatchBookingSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { status, tenantId } = validation.data;
    const directus = await getDirectusClient();

    // Verify the booking belongs to the tenant
    const bookings = await directus.request(
      readItems('bookings', {
        filter: { id: { _eq: id }, tenant_id: { _eq: tenantId } },
        limit: 1,
      })
    );

    if (!bookings || bookings.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Booking not found' },
        { status: 404 }
      );
    }

    const booking = bookings[0] as Record<string, unknown>;

    // Update status
    await directus.request(updateItem('bookings', id, { status }));

    // Send Telegram notification on cancellation
    if (status === 'cancelled' && TELEGRAM_BOT_TOKEN && TELEGRAM_ADMIN_ID) {
      const bookingDate = new Date(booking.date as string);
      const formattedDate = bookingDate.toLocaleDateString('ru-RU', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      });
      const formattedTime = bookingDate.toLocaleTimeString('ru-RU', {
        hour: '2-digit', minute: '2-digit',
      });

      const text = [
        `❌ <b>Бронирование отменено</b>`,
        ``,
        `<b>ID:</b> <code>${id}</code>`,
        `<b>Клиент:</b> ${booking.customer_name}`,
        `<b>Телефон:</b> ${booking.customer_phone}`,
        `<b>Дата:</b> ${formattedDate}`,
        `<b>Время:</b> ${formattedTime}`,
      ].join('\n');

      fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: TELEGRAM_ADMIN_ID, text, parse_mode: 'HTML' }),
      }).catch(e => console.error('[BookingPatch] Telegram error:', e));
    }

    return NextResponse.json({ success: true, id, status });
  } catch (error) {
    console.error('[BookingPatch] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update booking', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
