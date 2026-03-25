import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createDirectus, rest, createItems } from '@directus/sdk';
import { createRateLimiter } from '@/lib/rate-limit';

const limiter = createRateLimiter({ limit: 10, windowMs: 60_000, prefix: 'bookings' });

const DIRECTUS_URL = process.env.DIRECTUS_URL || process.env.NEXT_PUBLIC_DIRECTUS_URL || 'http://localhost:8055';
const directus = createDirectus(DIRECTUS_URL).with(rest());

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_ADMIN_ID = process.env.TELEGRAM_ADMIN_ID;

const CreateBookingSchema = z.object({
  tenantId: z.string().min(1, 'Tenant ID is required'),
  serviceId: z.string().min(1, 'Service ID is required'),
  customerName: z.string().min(2, 'Customer name must be at least 2 characters'),
  phone: z.string().min(10, 'Please enter a valid phone number'),
  email: z.string().email().optional().or(z.literal('')),
  date: z.string().min(1, 'Date is required'),
  notes: z.string().optional(),
  staffId: z.string().nullable().optional(),
  staffName: z.string().nullable().optional(),
});

type CreateBookingInput = z.infer<typeof CreateBookingSchema>;

export async function POST(request: NextRequest) {
  const blocked = limiter.check(request);
  if (blocked) return blocked;

  try {
    const body = await request.json();
    const validation = CreateBookingSchema.safeParse(body);
    if (!validation.success) {
      console.error('[Bookings API] Validation failed:', validation.error.issues);
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: validation.error.issues },
        { status: 400 }
      );
    }

    const data: CreateBookingInput = validation.data;

    // Fetch service name + duration for the booking record and notification
    let serviceName = `Service #${data.serviceId}`;
    let serviceDuration = 30;
    try {
      const res = await fetch(
        `${DIRECTUS_URL}/items/services?filter[id][_eq]=${encodeURIComponent(data.serviceId)}&filter[tenant_id][_eq]=${encodeURIComponent(data.tenantId)}&fields=name,duration&limit=1`
      );
      if (res.ok) {
        const json = await res.json() as { data?: { name?: string; duration?: number }[] };
        const svc = json.data?.[0];
        if (svc) {
          serviceName = svc.name || serviceName;
          serviceDuration = Number(svc.duration) || 30;
        }
      }
    } catch (e) {
      console.warn('[Bookings API] Could not fetch service:', e);
    }

    const bookingData: Record<string, unknown> = {
      tenant_id: data.tenantId,
      service_id: data.serviceId,
      customer_name: data.customerName,
      customer_phone: data.phone,
      customer_email: data.email || null,
      date: data.date,
      status: 'pending',
      notes: data.notes || null,
      service_duration: serviceDuration,
      staff_id: data.staffId || null,
    };

    const result = await directus.request(createItems('bookings', [bookingData]));
    const bookingId = (result as Record<string, unknown>[])?.[0]?.id;
    console.log('[Bookings API] Booking created:', bookingId);

    if (TELEGRAM_BOT_TOKEN && TELEGRAM_ADMIN_ID) {
      sendTelegramNotification({
        bookingId: String(bookingId),
        tenantId: data.tenantId,
        customerName: data.customerName,
        phone: data.phone,
        email: data.email,
        date: data.date,
        serviceName,
        staffName: data.staffName ?? undefined,
        notes: data.notes,
      }).catch(err => console.error('[Bookings API] Telegram failed:', err));
    }

    return NextResponse.json({
      success: true,
      bookingId: String(bookingId),
      message: 'Booking created successfully',
    });
  } catch (error) {
    console.error('[Bookings API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create booking', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function sendTelegramNotification(booking: {
  bookingId: string;
  tenantId: string;
  customerName: string;
  phone: string;
  email?: string;
  date: string;
  serviceName: string;
  staffName?: string;
  notes?: string;
}) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_ADMIN_ID) throw new Error('Telegram credentials not configured');

  const bookingDate = new Date(booking.date);
  const formattedDate = bookingDate.toLocaleDateString('ru-RU', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const formattedTime = bookingDate.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const lines = [
    `📅 <b>Новое бронирование!</b>`,
    ``,
    `<b>ID:</b> <code>${booking.bookingId}</code>`,
    `<b>Услуга:</b> ${booking.serviceName}`,
    booking.staffName ? `<b>Мастер:</b> ${booking.staffName}` : null,
    `<b>Дата:</b> ${formattedDate}`,
    `<b>Время:</b> ${formattedTime}`,
    ``,
    `<b>Клиент:</b>`,
    `• Имя: ${booking.customerName}`,
    `• Телефон: ${booking.phone}`,
    booking.email ? `• Email: ${booking.email}` : null,
    booking.notes ? `• Заметки: ${booking.notes}` : null,
    ``,
    `<b>Статус:</b> ожидает подтверждения`,
  ].filter(line => line !== null).join('\n');

  const response = await fetch(
    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_ADMIN_ID,
        text: lines,
        parse_mode: 'HTML',
      }),
    }
  );

  const result = await response.json();
  if (!response.ok || !result.ok) throw new Error(result.description || 'Failed to send');
  console.log('[Bookings API] Telegram sent, message_id:', result.result.message_id);
}
