import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createDirectus, rest, createItems } from '@directus/sdk';

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
});

type CreateBookingInput = z.infer<typeof CreateBookingSchema>;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = CreateBookingSchema.safeParse(body);
    if (!validation.success) {
      console.error('[Bookings API] Validation failed:', validation.error.issues);
      return NextResponse.json({ success: false, error: 'Validation failed', details: validation.error.issues }, { status: 400 });
    }
    const data: CreateBookingInput = validation.data;
    const bookingData = { tenant_id: data.tenantId, service_id: data.serviceId, customer_name: data.customerName, customer_phone: data.phone, customer_email: data.email || null, date: data.date, status: 'pending', notes: data.notes || null };
    const result = await directus.request(createItems('bookings', [bookingData]));
    const bookingId = (result as Record<string, unknown>[])?.[0]?.id;
    console.log('[Bookings API] Booking created:', bookingId);
    if (TELEGRAM_BOT_TOKEN && TELEGRAM_ADMIN_ID) {
      sendTelegramNotification({ bookingId: String(bookingId), ...data }).catch(err => console.error('[Bookings API] Telegram failed:', err));
    }
    return NextResponse.json({ success: true, bookingId: String(bookingId), message: 'Booking created successfully' });
  } catch (error) {
    console.error('[Bookings API] Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create booking', message: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

async function sendTelegramNotification(booking: { bookingId: string; tenantId: string; customerName: string; phone: string; date: string; serviceId: string }) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_ADMIN_ID) throw new Error('Telegram credentials not configured');
  const message = `📅 <b>New Booking!</b>\nID: ${booking.bookingId}\nStore: ${booking.tenantId}\nDate: ${new Date(booking.date).toLocaleString()}\nCustomer: ${booking.customerName}\nPhone: ${booking.phone}`;
  const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: TELEGRAM_ADMIN_ID, text: message, parse_mode: 'HTML' }) });
  const result = await response.json();
  if (!response.ok || !result.ok) throw new Error(result.description || 'Failed to send');
  console.log('[Bookings API] Telegram sent');
}
