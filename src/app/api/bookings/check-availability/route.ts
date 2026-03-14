import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createDirectus, rest, readItems } from '@directus/sdk';

const DIRECTUS_URL = process.env.DIRECTUS_URL || process.env.NEXT_PUBLIC_DIRECTUS_URL || 'http://localhost:8055';
const directus = createDirectus(DIRECTUS_URL).with(rest());

// Login for server-side
const DIRECTUS_ADMIN_EMAIL = process.env.DIRECTUS_ADMIN_EMAIL;
const DIRECTUS_ADMIN_PASSWORD = process.env.DIRECTUS_ADMIN_PASSWORD;

let adminToken: string | null = null;

async function getAdminToken() {
  if (adminToken) return adminToken;
  
  const auth = await fetch(`${DIRECTUS_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: DIRECTUS_ADMIN_EMAIL, password: DIRECTUS_ADMIN_PASSWORD }),
  });
  
  const data = await auth.json();
  adminToken = data.data?.access_token || null;
  return adminToken;
}

const CheckAvailabilitySchema = z.object({
  tenantId: z.string().min(1),
  serviceId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
});

/**
 * Generate time slots for a day
 */
function generateTimeSlots(startTime: string, endTime: string, duration: number): string[] {
  const slots: string[] = [];
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);
  
  let currentMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  
  while (currentMinutes + duration <= endMinutes) {
    const hours = Math.floor(currentMinutes / 60);
    const mins = currentMinutes % 60;
    slots.push(`${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`);
    currentMinutes += duration;
  }
  
  return slots;
}

/**
 * GET /api/bookings/check-availability
 * 
 * Returns available time slots for a given date and service
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = CheckAvailabilitySchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { tenantId, serviceId, date } = validation.data;
    console.log(`[Availability API] Checking availability for ${date} - ${serviceId} - ${tenantId}`);

    // Get service duration
    const services = await directus.request(
      readItems('services', {
        filter: { id: { _eq: serviceId }, tenant_id: { _eq: tenantId } },
        limit: 1,
      })
    );

    if (!services || services.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Service not found' },
        { status: 404 }
      );
    }

    const service = services[0];
    const duration = service.duration || 30; // Default 30 minutes
    console.log(`[Availability API] Service duration: ${duration} min`);

    // Get all confirmed/pending bookings for this date
    const token = await getAdminToken();
    const adminDirectus = createDirectus(DIRECTUS_URL, { staticToken: token }).with(rest());
    
    const bookings = await adminDirectus.request(
      readItems('bookings', {
        filter: {
          tenant_id: { _eq: tenantId },
          date: { _starts_with: date },
          status: { _in: ['confirmed', 'pending'] },
        },
      })
    );

    console.log(`[Availability API] Found ${bookings?.length || 0} existing bookings`);

    // Generate all possible slots (9:00 - 18:00)
    const allSlots = generateTimeSlots('09:00', '18:00', duration);
    console.log(`[Availability API] Generated ${allSlots.length} total slots`);

    // Mark booked slots
    const bookedSlots = new Set<string>();
    bookings?.forEach((booking: Record<string, unknown>) => {
      if (booking.date) {
        const bookingDate = new Date(booking.date as string);
        
        // Mark this slot and overlapping slots as booked
        const bookingStartMinutes = bookingDate.getHours() * 60 + bookingDate.getMinutes();
        const bookingEndMinutes = bookingStartMinutes + (Number(booking.service_duration) || duration);
        
        for (let i = bookingStartMinutes; i < bookingEndMinutes; i += duration) {
          const h = Math.floor(i / 60);
          const m = i % 60;
          bookedSlots.add(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
        }
      }
    });

    console.log(`[Availability API] Booked slots: ${bookedSlots.size}`);

    // Filter available slots
    const availableSlots = allSlots.filter(slot => !bookedSlots.has(slot));
    const bookedSlotsArray = Array.from(bookedSlots).sort();

    console.log(`[Availability API] Available slots: ${availableSlots.length}`);

    return NextResponse.json({
      success: true,
      date,
      serviceId,
      duration,
      availableSlots,
      bookedSlots: bookedSlotsArray,
      workingHours: { start: '09:00', end: '18:00' },
    });

  } catch (error) {
    console.error('[Availability API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check availability', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
