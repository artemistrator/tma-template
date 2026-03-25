'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAdmin, useAdminFetch } from '@/lib/admin/admin-context';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { StatCard } from '@/components/admin/stat-card';
import { PageHeader } from '@/components/admin/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { AnalyticsSection } from '@/components/admin/charts/analytics-section';

type Period = 'today' | '7d' | '30d';

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
];

interface Stats {
  tenantName: string;
  businessType: string;
  period: string;
  orders?: {
    total: number;
    totalRevenue: number;
    periodCount: number;
    periodRevenue: number;
    pending: number;
  };
  bookings?: {
    total: number;
    periodCount: number;
    pending: number;
  };
  recentOrders?: Array<{
    id: string | number;
    customer_name: string;
    total: number;
    status: string;
    created_at: string;
  }>;
  recentBookings?: Array<{
    id: string | number;
    customer_name: string;
    customer_phone: string;
    date: string;
    status: string;
    created_at: string;
  }>;
  reviews?: {
    pending: number;
    approved: number;
  };
  productCount?: number;
  serviceCount?: number;
  staffCount?: number;
  infoProductCount?: number;
}

function PeriodSelector({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  return (
    <div className="inline-flex bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
      {PERIOD_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            value === opt.value
              ? 'bg-white dark:bg-gray-700 text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const { admin } = useAdmin();
  const adminFetch = useAdminFetch();
  const params = useParams();
  const slug = params.slug as string;
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('today');

  const loadStats = useCallback(async () => {
    if (!admin) return;
    setLoading(true);
    try {
      const data = await adminFetch(`/stats?period=${period}`);
      if (data.success) setStats(data);
    } catch {
      // ignore
    }
    setLoading(false);
  }, [admin, adminFetch, period]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  if (loading && !stats) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded-lg w-48 animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!stats) {
    return <p className="text-muted-foreground">Failed to load dashboard</p>;
  }

  const periodLabel = PERIOD_OPTIONS.find(o => o.value === period)?.label || 'Today';

  return (
    <div className="space-y-6">
      <PageHeader
        title={stats.tenantName}
        description={`${stats.businessType.charAt(0).toUpperCase() + stats.businessType.slice(1)} dashboard`}
        actions={<PeriodSelector value={period} onChange={setPeriod} />}
      />

      {/* Primary KPIs — large */}
      {stats.orders && (
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label={`Revenue (${periodLabel})`}
            value={stats.orders.periodRevenue > 0 ? stats.orders.periodRevenue.toLocaleString() : '0'}
            sub={`${stats.orders.totalRevenue.toLocaleString()} all time`}
            emphasis
          />
          <StatCard
            label={`Orders (${periodLabel})`}
            value={stats.orders.periodCount}
            sub={`${stats.orders.total} all time`}
            emphasis
          />
        </div>
      )}

      {stats.bookings && (
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label={`Bookings (${periodLabel})`}
            value={stats.bookings.periodCount}
            sub={`${stats.bookings.total} all time`}
            emphasis
          />
          <StatCard
            label="Pending"
            value={stats.bookings.pending}
            emphasis
          />
        </div>
      )}

      {/* Secondary stats — smaller grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.orders && (
          <StatCard label="Pending orders" value={stats.orders.pending} />
        )}
        {stats.reviews && (
          <>
            <StatCard label="Reviews pending" value={stats.reviews.pending} />
            <StatCard label="Reviews approved" value={stats.reviews.approved} />
          </>
        )}
        {stats.productCount !== undefined && <StatCard label="Products" value={stats.productCount} />}
        {stats.serviceCount !== undefined && <StatCard label="Services" value={stats.serviceCount} />}
        {stats.staffCount !== undefined && <StatCard label="Staff" value={stats.staffCount} />}
        {stats.infoProductCount !== undefined && <StatCard label="Info Products" value={stats.infoProductCount} />}
      </div>

      {/* Recent orders */}
      {stats.recentOrders && stats.recentOrders.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-medium text-sm">Recent Orders</h2>
            <Link href={`/admin/${slug}/orders`} className="text-xs text-primary hover:underline">View all</Link>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
            {stats.recentOrders.map((order) => (
              <Link
                key={order.id}
                href={`/admin/${slug}/orders/${order.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{order.customer_name}</p>
                  <p className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-2.5 ml-3 shrink-0">
                  {order.total != null && (
                    <span className="text-sm font-medium">{order.total.toLocaleString()}</span>
                  )}
                  <StatusBadge status={order.status} size="sm" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Recent bookings */}
      {stats.recentBookings && stats.recentBookings.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-medium text-sm">Recent Bookings</h2>
            <Link href={`/admin/${slug}/orders`} className="text-xs text-primary hover:underline">View all</Link>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
            {stats.recentBookings.map((booking) => (
              <Link
                key={booking.id}
                href={`/admin/${slug}/orders/${booking.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{booking.customer_name}</p>
                  <p className="text-xs text-muted-foreground">{booking.date} &middot; {booking.customer_phone}</p>
                </div>
                <StatusBadge status={booking.status} size="sm" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Analytics section */}
      <AnalyticsSection
        businessType={stats.businessType}
        period={period}
        currency={stats.businessType === 'booking' ? '' : ''}
      />
    </div>
  );
}
