'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface StatusCount {
  status: string;
  count: number;
}

interface OrdersChartProps {
  byStatus: StatusCount[];
  total: number;
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'hsl(var(--color-warning))',
  confirmed: 'hsl(var(--color-info))',
  processing: 'hsl(var(--color-info))',
  shipped: 'hsl(220 70% 60%)',
  delivered: 'hsl(var(--color-success))',
  cancelled: 'hsl(var(--color-error))',
};

export function OrdersChart({ byStatus, total }: OrdersChartProps) {
  if (byStatus.length === 0) return null;

  const data = byStatus.map(s => ({
    name: s.status.charAt(0).toUpperCase() + s.status.slice(1),
    count: s.count,
    fill: STATUS_COLORS[s.status] || 'hsl(var(--primary))',
  }));

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium">Orders by Status</h2>
        <span className="text-xs text-muted-foreground">{total} total</span>
      </div>
      <ResponsiveContainer width="100%" height={120}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="opacity-10" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 10, fill: 'currentColor', opacity: 0.6 }}
            tickLine={false}
            axisLine={false}
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
            formatter={(value: number) => [value, 'Orders']}
            labelStyle={{ opacity: 0.7 }}
          />
          <Bar dataKey="count" radius={[3, 3, 0, 0]} maxBarSize={32}>
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
