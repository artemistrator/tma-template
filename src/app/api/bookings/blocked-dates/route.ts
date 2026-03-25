import { NextRequest, NextResponse } from 'next/server';

const DIRECTUS_URL = process.env.DIRECTUS_URL || process.env.NEXT_PUBLIC_DIRECTUS_URL || 'http://localhost:8055';

/**
 * GET /api/bookings/blocked-dates?tenantId=barber
 * Returns blocked specific dates AND day-off weekdays for the tenant.
 * Used by BookingCalendar to disable unavailable days.
 */
export async function GET(request: NextRequest) {
  const tenantId = request.nextUrl.searchParams.get('tenantId');

  if (!tenantId) {
    return NextResponse.json({ error: 'tenantId is required' }, { status: 400 });
  }

  // Fetch specific blocked dates
  let blockedDates: { date: string; reason?: string }[] = [];
  try {
    const res = await fetch(
      `${DIRECTUS_URL}/items/blocked_dates?filter[tenant_id][_eq]=${encodeURIComponent(tenantId)}&fields=date,reason`
    );
    if (res.ok) {
      const json = await res.json() as { data?: { date: string; reason?: string | null }[] };
      blockedDates = (json.data ?? []).map((r) => ({
        date: r.date,
        reason: r.reason ?? undefined,
      }));
    }
  } catch {
    console.warn('[BlockedDates API] blocked_dates collection not accessible');
  }

  // Fetch day-off weekdays from working_hours
  let dayOffWeekdays: number[] = [];
  try {
    const res = await fetch(
      `${DIRECTUS_URL}/items/working_hours?filter[tenant_id][_eq]=${encodeURIComponent(tenantId)}&filter[is_day_off][_eq]=true&fields=day_of_week`
    );
    if (res.ok) {
      const json = await res.json() as { data?: { day_of_week: number }[] };
      dayOffWeekdays = (json.data ?? []).map((r) => r.day_of_week);
    }
  } catch {
    console.warn('[BlockedDates API] working_hours collection not accessible');
  }

  return NextResponse.json({ success: true, blockedDates, dayOffWeekdays });
}
