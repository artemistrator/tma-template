import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const DIRECTUS_URL = process.env.DIRECTUS_URL || process.env.NEXT_PUBLIC_DIRECTUS_URL || 'http://localhost:8055';

const CheckAvailabilitySchema = z.object({
  tenantId: z.string().min(1),
  serviceId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export interface StaffMember {
  id: string;
  name: string;
  role?: string;
  photo?: string;
}

export interface SlotWithStaff {
  time: string;
  availableStaff: StaffMember[];
}

/** Generate time slots for a day */
function generateTimeSlots(startTime: string, endTime: string, duration: number): string[] {
  const slots: string[] = [];
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);

  let cur = startHour * 60 + startMin;
  const end = endHour * 60 + endMin;

  while (cur + duration <= end) {
    const h = Math.floor(cur / 60);
    const m = cur % 60;
    slots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
    cur += duration;
  }
  return slots;
}

/** Returns set of slot strings blocked by a single booking */
function getBlockedSlots(bookingDateStr: string, duration: number, slotDuration: number): Set<string> {
  const blocked = new Set<string>();
  const timePart = bookingDateStr.includes('T') ? bookingDateStr.split('T')[1] : null;
  if (!timePart) return blocked;

  const [hStr, mStr] = timePart.split(':');
  const start = parseInt(hStr, 10) * 60 + parseInt(mStr, 10);
  const end = start + duration;

  for (let i = start; i < end; i += slotDuration) {
    const h = Math.floor(i / 60);
    const m = i % 60;
    blocked.add(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
  }
  return blocked;
}

/**
 * POST /api/bookings/check-availability
 * Returns available time slots with available staff per slot.
 * Falls back to global (no-staff) mode if no staff are found.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = CheckAvailabilitySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { tenantId, serviceId, date } = validation.data;

    // --- Service duration ---
    let duration = 30;
    try {
      const res = await fetch(
        `${DIRECTUS_URL}/items/services?filter[id][_eq]=${encodeURIComponent(serviceId)}&filter[tenant_id][_eq]=${encodeURIComponent(tenantId)}&fields=duration&limit=1`
      );
      if (res.ok) {
        const json = await res.json() as { data?: { duration?: number }[] };
        const svc = json.data?.[0];
        if (svc?.duration) duration = Number(svc.duration) || 30;
      }
    } catch {
      console.warn('[Availability] could not fetch service duration, using 30 min default');
    }

    // --- Working hours ---
    const dayOfWeek = new Date(date).getDay();
    let startTime = '09:00';
    let endTime = '18:00';
    let isDayOff = false;
    let dayOffReason: string | undefined;

    try {
      const res = await fetch(
        `${DIRECTUS_URL}/items/working_hours?filter[tenant_id][_eq]=${encodeURIComponent(tenantId)}&filter[day_of_week][_eq]=${dayOfWeek}&limit=1`
      );
      if (res.ok) {
        const json = await res.json() as { data?: { is_day_off?: boolean; start_time?: string; end_time?: string }[] };
        const wh = json.data?.[0];
        if (wh) {
          if (wh.is_day_off) {
            isDayOff = true;
          } else {
            startTime = wh.start_time || '09:00';
            endTime = wh.end_time || '18:00';
          }
        }
      }
    } catch {
      console.warn('[Availability] working_hours not accessible, using defaults');
    }

    // --- Blocked dates ---
    if (!isDayOff) {
      try {
        const res = await fetch(
          `${DIRECTUS_URL}/items/blocked_dates?filter[tenant_id][_eq]=${encodeURIComponent(tenantId)}&filter[date][_eq]=${date}&limit=1`
        );
        if (res.ok) {
          const json = await res.json() as { data?: { reason?: string }[] };
          if (json.data && json.data.length > 0) {
            isDayOff = true;
            dayOffReason = json.data[0].reason;
          }
        }
      } catch {
        console.warn('[Availability] blocked_dates not accessible');
      }
    }

    if (isDayOff) {
      return NextResponse.json({
        success: true,
        date,
        serviceId,
        duration,
        slotsWithStaff: [],
        availableSlots: [],
        isDayOff: true,
        reason: dayOffReason,
        workingHours: { start: startTime, end: endTime },
      });
    }

    const allSlots = generateTimeSlots(startTime, endTime, duration);

    // --- Fetch all active staff for this tenant ---
    let staffList: StaffMember[] = [];
    try {
      const res = await fetch(
        `${DIRECTUS_URL}/items/staff?filter[tenant_id][_eq]=${encodeURIComponent(tenantId)}&filter[status][_eq]=active&fields=id,name,role,image`
      );
      if (res.ok) {
        const json = await res.json() as { data?: { id: number | string; name: string; role?: string; image?: string | null }[] };
        staffList = (json.data ?? []).map((s) => ({
          id: String(s.id),
          name: s.name,
          role: s.role ?? undefined,
          photo: s.image ?? undefined,
        }));
      }
    } catch {
      console.warn('[Availability] staff collection not accessible, falling back to global mode');
    }

    // --- Fetch all active bookings for this tenant (filter by date in code — Directus date range filter is unreliable) ---
    type BookingRow = { date: string; service_duration?: number; staff_id?: string | null; status?: string };
    let allBookings: BookingRow[] = [];
    try {
      const res = await fetch(
        `${DIRECTUS_URL}/items/bookings?filter[tenant_id][_eq]=${encodeURIComponent(tenantId)}&fields=date,service_duration,staff_id,status&limit=500`
      );
      if (res.ok) {
        const json = await res.json() as { data?: BookingRow[] };
        // Filter by date (date string starts with YYYY-MM-DD) and active statuses
        allBookings = (json.data ?? []).filter((b) => {
          if (!b.date) return false;
          const bDate = b.date.split('T')[0];
          const status = b.status ?? 'pending';
          return bDate === date && (status === 'confirmed' || status === 'pending');
        });
      }
    } catch {
      console.warn('[Availability] bookings not accessible, assuming all slots free');
    }

    // --- If no staff found, fall back to global slot mode ---
    if (staffList.length === 0) {
      const globalBlocked = new Set<string>();
      allBookings.forEach((b) => {
        getBlockedSlots(b.date, Number(b.service_duration) || duration, duration)
          .forEach((s) => globalBlocked.add(s));
      });

      const availableSlots = allSlots.filter((s) => !globalBlocked.has(s));
      return NextResponse.json({
        success: true,
        date,
        serviceId,
        duration,
        workingHours: { start: startTime, end: endTime },
        availableSlots,
        bookedSlots: Array.from(globalBlocked).sort(),
        slotsWithStaff: availableSlots.map((time) => ({ time, availableStaff: [] })),
      });
    }

    // --- Per-staff availability ---
    // Map: staffId → Set of blocked slot strings
    const staffBlockedSlots = new Map<string, Set<string>>();
    for (const staff of staffList) {
      staffBlockedSlots.set(staff.id, new Set());
    }

    allBookings.forEach((booking) => {
      const bookingDuration = Number(booking.service_duration) || duration;
      const blocked = getBlockedSlots(booking.date, bookingDuration, duration);

      if (booking.staff_id) {
        // Block only for this specific staff member
        const set = staffBlockedSlots.get(String(booking.staff_id));
        if (set) blocked.forEach((s) => set.add(s));
      } else {
        // Legacy booking without staff_id — block for ALL staff (conservative)
        Array.from(staffBlockedSlots.values()).forEach((set) => {
          blocked.forEach((s) => set.add(s));
        });
      }
    });

    // Build slotsWithStaff
    const slotsWithStaff: SlotWithStaff[] = allSlots.map((time) => {
      const availableStaff = staffList.filter(
        (staff) => !staffBlockedSlots.get(staff.id)!.has(time)
      );
      return { time, availableStaff };
    }).filter((slot) => slot.availableStaff.length > 0);

    // Also build flat availableSlots for backward compat
    const availableSlots = slotsWithStaff.map((s) => s.time);

    return NextResponse.json({
      success: true,
      date,
      serviceId,
      duration,
      workingHours: { start: startTime, end: endTime },
      slotsWithStaff,
      availableSlots,
    });

  } catch (error) {
    console.error('[Availability] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check availability', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
