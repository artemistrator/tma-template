'use client';

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface TrendPoint {
  date: string;
  revenue: number;
  count: number;
}

interface RevenueChartProps {
  trend: TrendPoint[];
  totalRevenue: number;
  totalOrders: number;
  aov: number;
  currency?: string;
}

function shortDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatRevenue(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}k`;
  return String(value);
}

export function RevenueChart({ trend, totalRevenue, totalOrders, aov, currency = '' }: RevenueChartProps) {
  const data = trend.map(p => ({ ...p, label: shortDate(p.date) }));
  const hasData = trend.some(p => p.revenue > 0);

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium">Revenue</h2>
        <div className="flex gap-4">
          <div className="text-right">
            <p className="text-xs text-muted-foreground">AOV</p>
            <p className="text-sm font-semibold">{currency}{aov.toLocaleString()}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-sm font-semibold">{currency}{totalRevenue.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {!hasData ? (
        <div className="h-32 flex items-center justify-center text-sm text-muted-foreground">
          No revenue data for this period
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="opacity-10" />
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
              tickFormatter={formatRevenue}
            />
            <Tooltip
              contentStyle={{
                fontSize: 12,
                borderRadius: 8,
                border: '1px solid rgba(0,0,0,0.1)',
                backgroundColor: 'var(--background)',
                color: 'var(--foreground)',
              }}
              formatter={(value: number) => [`${currency}${value.toLocaleString()}`, 'Revenue']}
              labelStyle={{ opacity: 0.7 }}
            />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}

      <div className="flex justify-between text-xs text-muted-foreground pt-1 border-t border-gray-100 dark:border-gray-800">
        <span>{totalOrders} orders</span>
        <span>avg {currency}{aov.toLocaleString()} per order</span>
      </div>
    </div>
  );
}
