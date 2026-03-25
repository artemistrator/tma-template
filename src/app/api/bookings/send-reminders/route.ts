import { NextResponse } from 'next/server';
import { createDirectus, rest, readItems, authentication } from '@directus/sdk';

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

/**
 * POST /api/bookings/send-reminders
 * Fetches all bookings for tomorrow and sends Telegram reminder to admin.
 * Call daily via cron (e.g. Vercel Cron, cron-job.org, GitHub Actions).
 *
 * Vercel cron: add to vercel.json:
 * { "crons": [{ "path": "/api/bookings/send-reminders", "schedule": "0 8 * * *" }] }
 */
export async function POST() {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_ADMIN_ID) {
    return NextResponse.json({ success: false, error: 'Telegram credentials not configured' }, { status: 500 });
  }

  try {
    const directus = await getDirectusClient();

    // Calculate tomorrow's date range
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    const startOfTomorrow = `${tomorrowStr}T00:00:00`;
    const endOfTomorrow = `${tomorrowStr}T23:59:59.999`;

    const bookings = await directus.request(
      readItems('bookings', {
        filter: {
          date: { _gte: startOfTomorrow, _lte: endOfTomorrow },
          status: { _in: ['confirmed', 'pending'] },
        },
        sort: ['date'],
      })
    );

    if (!bookings || bookings.length === 0) {
      return NextResponse.json({ success: true, sent: 0, message: 'No bookings tomorrow' });
    }

    const rows = bookings as Record<string, unknown>[];
    let sent = 0;

    for (const booking of rows) {
      const bookingDate = new Date(booking.date as string);
      const formattedTime = bookingDate.toLocaleTimeString('ru-RU', {
        hour: '2-digit', minute: '2-digit',
      });

      const text = [
        `⏰ <b>Напоминание о записи завтра</b>`,
        ``,
        `<b>ID:</b> <code>${booking.id}</code>`,
        `<b>Клиент:</b> ${booking.customer_name}`,
        `<b>Телефон:</b> ${booking.customer_phone}`,
        `<b>Время:</b> ${formattedTime}`,
        `<b>Статус:</b> ${booking.status}`,
      ].join('\n');

      try {
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: TELEGRAM_ADMIN_ID, text, parse_mode: 'HTML' }),
        });
        sent++;
      } catch (e) {
        console.error(`[Reminders] Failed to send for booking ${booking.id}:`, e);
      }
    }

    return NextResponse.json({ success: true, sent, total: rows.length });
  } catch (error) {
    console.error('[Reminders] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send reminders', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
