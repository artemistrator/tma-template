import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/admin/auth';
import { DIRECTUS_URL } from '@/lib/orchestrator/admin-client';

const DIRECTUS_TOKEN = () => process.env.DIRECTUS_ADMIN_TOKEN || '';

async function directusFetch(path: string) {
  const res = await fetch(`${DIRECTUS_URL}${path}`, {
    headers: { Authorization: `Bearer ${DIRECTUS_TOKEN()}` },
    cache: 'no-store',
  });
  return res.json();
}

function getPeriodStart(period: string): string {
  const d = new Date();
  if (period === '7d') d.setDate(d.getDate() - 7);
  else if (period === '30d') d.setDate(d.getDate() - 30);
  else d.setHours(0, 0, 0, 0);
  return d.toISOString().split('T')[0];
}

/**
 * GET /api/admin/[slug]/analytics/bookings
 * Booking analytics: utilization, cancellation rate, top services, upcoming.
 * Query: period=today|7d|30d
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const auth = requireAdminAuth(request, slug);
  if ('error' in auth) return auth.error;

  try {
    const period = request.nextUrl.searchParams.get('period') || '7d';
    const periodStart = getPeriodStart(period);

    // Fetch bookings in period + upcoming bookings
    const today = new Date().toISOString().split('T')[0];
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const nextWeekStr = nextWeek.toISOString().split('T')[0];

    const [bookingsData, upcomingData, servicesData] = await Promise.all([
      directusFetch(
        `/items/bookings?filter[tenant_id][_eq]=${slug}&filter[created_at][_gte]=${periodStart}&fields=id,status,service_id,date,staff_id&limit=-1`
      ),
      directusFetch(
        `/items/bookings?filter[tenant_id][_eq]=${slug}&filter[date][_gte]=${today}&filter[date][_lte]=${nextWeekStr}&filter[status][_in]=pending,confirmed&sort=date&fields=id,customer_name,customer_phone,date,status,service_id&limit=10`
      ),
      directusFetch(
        `/items/services?filter[tenant_id][_eq]=${slug}&filter[status][_eq]=active&fields=id,name&limit=50`
      ),
    ]);

    const bookings: Array<{ id: string; status: string; service_id: string; date: string; staff_id?: string }> =
      bookingsData.data || [];
    const upcoming: Array<{ id: string; customer_name: string; customer_phone?: string; date: string; status: string; service_id: string }> =
      upcomingData.data || [];
    const services: Array<{ id: string; name: string }> = servicesData.data || [];
    const serviceMap = Object.fromEntries(services.map(s => [String(s.id), s.name]));

    // Cancellation rate
    const total = bookings.length;
    const cancelled = bookings.filter(b => b.status === 'cancelled').length;
    const confirmed = bookings.filter(b => b.status === 'confirmed' || b.status === 'completed').length;
    const cancellationRate = total > 0 ? Math.round((cancelled / total) * 100) : 0;

    // Top services
    const serviceCount: Record<string, number> = {};
    for (const b of bookings) {
      if (b.status !== 'cancelled') {
        const sid = String(b.service_id);
        serviceCount[sid] = (serviceCount[sid] || 0) + 1;
      }
    }
    const topServices = Object.entries(serviceCount)
      .map(([id, count]) => ({ id, name: serviceMap[id] || `Service ${id}`, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Staff workload
    const staffCount: Record<string, number> = {};
    for (const b of bookings) {
      if (b.staff_id && b.status !== 'cancelled') {
        const sid = String(b.staff_id);
        staffCount[sid] = (staffCount[sid] || 0) + 1;
      }
    }

    // Trend by day
    const days = period === '30d' ? 30 : period === '7d' ? 7 : 1;
    const dayMap: Record<string, number> = {};
    for (const b of bookings) {
      const day = b.date?.split('T')[0];
      if (day) dayMap[day] = (dayMap[day] || 0) + 1;
    }
    const trend = Array.from({ length: days }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (days - 1 - i));
      const date = d.toISOString().split('T')[0];
      return { date, count: dayMap[date] || 0 };
    });

    // Annotate upcoming with service names
    const upcomingAnnotated = upcoming.map(b => ({
      ...b,
      service_name: serviceMap[String(b.service_id)] || 'Unknown',
    }));

    return NextResponse.json({
      success: true,
      total,
      confirmed,
      cancelled,
      cancellationRate,
      topServices,
      upcoming: upcomingAnnotated,
      trend,
      period,
    });
  } catch (error) {
    console.error('[Analytics Bookings] Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load booking analytics' }, { status: 500 });
  }
}
