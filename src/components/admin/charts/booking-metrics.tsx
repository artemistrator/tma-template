'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface TrendPoint {
  date: string;
  count: number;
}

interface ServiceRow {
  id: string;
  name: string;
  count: number;
}

interface UpcomingBooking {
  id: string;
  customer_name: string;
  customer_phone?: string;
  date: string;
  status: string;
  service_name: string;
}

interface BookingMetricsProps {
  total: number;
  confirmed: number;
  cancelled: number;
  cancellationRate: number;
  topServices: ServiceRow[];
  upcoming: UpcomingBooking[];
  trend: TrendPoint[];
}

function shortDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function BookingMetrics({
  total,
  confirmed,
  cancelled,
  cancellationRate,
  topServices,
  upcoming,
  trend,
}: BookingMetricsProps) {
  const hasData = trend.some(p => p.count > 0);
  const chartData = trend.map(p => ({ ...p, label: shortDate(p.date) }));

  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-3 text-center">
          <p className="text-2xl font-bold">{total}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Total</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-3 text-center">
          <p className="text-2xl font-bold text-success-foreground">{confirmed}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Confirmed</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-3 text-center">
          <p className="text-2xl font-bold text-error-foreground">{cancellationRate}%</p>
          <p className="text-xs text-muted-foreground mt-0.5">Cancelled</p>
        </div>
      </div>

      {/* Trend chart */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
        <h2 className="text-sm font-medium mb-3">Booking Trend</h2>
        {!hasData ? (
          <div className="h-28 flex items-center justify-center text-sm text-muted-foreground">
            No bookings in this period
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="opacity-10" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: 'currentColor', opacity: 0.5 }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 10, fill: 'currentColor', opacity: 0.5 }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 8,
                  border: '1px solid rgba(0,0,0,0.1)',
                  backgroundColor: 'var(--background)',
                  color: 'var(--foreground)',
                }}
                formatter={(value: number) => [value, 'Bookings']}
                labelStyle={{ opacity: 0.7 }}
              />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} maxBarSize={24} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Top services */}
      {topServices.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
          <h2 className="text-sm font-medium mb-3">Popular Services</h2>
          <div className="space-y-2">
            {topServices.map((s, i) => (
              <div key={s.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-4">{i + 1}</span>
                  <span className="text-sm truncate">{s.name}</span>
                </div>
                <span className="text-sm font-medium ml-2">{s.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming bookings */}
      {upcoming.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
          <h2 className="text-sm font-medium mb-3">Upcoming (7 days)</h2>
          <div className="space-y-2.5">
            {upcoming.map(b => (
              <div key={b.id} className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{b.customer_name}</p>
                  <p className="text-xs text-muted-foreground">{b.service_name}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-medium">{b.date}</p>
                  {b.customer_phone && <p className="text-xs text-muted-foreground">{b.customer_phone}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
