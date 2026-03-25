'use client';

import React, { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useAdminFetch } from '@/lib/admin/admin-context';

const RevenueChart = dynamic(() => import('./revenue-chart').then(m => ({ default: m.RevenueChart })), { ssr: false });
const TopProductsTable = dynamic(() => import('./top-products-table').then(m => ({ default: m.TopProductsTable })), { ssr: false });
const BookingMetrics = dynamic(() => import('./booking-metrics').then(m => ({ default: m.BookingMetrics })), { ssr: false });
const OrdersChart = dynamic(() => import('./orders-chart').then(m => ({ default: m.OrdersChart })), { ssr: false });

interface RevenueData {
  trend: Array<{ date: string; revenue: number; count: number }>;
  totalRevenue: number;
  totalOrders: number;
  aov: number;
}

interface TopProductsData {
  products: Array<{ id: string; name: string; units: number; revenue: number }>;
  lowStock: Array<{ id: string; name: string; stock_quantity: number }>;
}

interface OrdersData {
  total: number;
  byStatus: Array<{ status: string; count: number }>;
}

interface BookingData {
  total: number;
  confirmed: number;
  cancelled: number;
  cancellationRate: number;
  topServices: Array<{ id: string; name: string; count: number }>;
  upcoming: Array<{ id: string; customer_name: string; customer_phone?: string; date: string; status: string; service_name: string }>;
  trend: Array<{ date: string; count: number }>;
}

interface AnalyticsSectionProps {
  businessType: string;
  period: string;
  currency?: string;
}

function Skeleton() {
  return (
    <div className="space-y-4">
      <div className="h-48 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
      <div className="h-48 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
    </div>
  );
}

export function AnalyticsSection({ businessType, period, currency = '' }: AnalyticsSectionProps) {
  const adminFetch = useAdminFetch();
  const [open, setOpen] = useState(true);
  const [loading, setLoading] = useState(true);

  const [revenueData, setRevenueData] = useState<RevenueData | null>(null);
  const [topProductsData, setTopProductsData] = useState<TopProductsData | null>(null);
  const [ordersData, setOrdersData] = useState<OrdersData | null>(null);
  const [bookingData, setBookingData] = useState<BookingData | null>(null);

  const load = useCallback(async () => {
    setLoading(true);

    if (businessType === 'ecommerce' || businessType === 'infobiz') {
      const [rev, top, ord] = await Promise.all([
        adminFetch(`/analytics/revenue?period=${period}`),
        adminFetch(`/analytics/top-products?period=${period}`),
        adminFetch(`/analytics/orders?period=${period}`),
      ]);
      if (rev.success) setRevenueData(rev);
      if (top.success) setTopProductsData(top);
      if (ord.success) setOrdersData(ord);
    } else if (businessType === 'booking') {
      const bk = await adminFetch(`/analytics/bookings?period=${period}`);
      if (bk.success) setBookingData(bk);
    }

    setLoading(false);
  }, [adminFetch, businessType, period]);

  useEffect(() => { load(); }, [load]);

  if (businessType === 'infobiz' && !revenueData && !loading) return null;

  return (
    <div>
      {/* Section header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center justify-between w-full text-left mb-3"
      >
        <h2 className="font-medium text-sm">Analytics</h2>
        <svg
          className={`w-4 h-4 text-muted-foreground transition-transform ${open ? '' : '-rotate-90'}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        loading ? <Skeleton /> : (
          <div className="space-y-4">
            {/* Ecommerce / Infobiz */}
            {(businessType === 'ecommerce' || businessType === 'infobiz') && (
              <>
                {revenueData && (
                  <RevenueChart
                    trend={revenueData.trend}
                    totalRevenue={revenueData.totalRevenue}
                    totalOrders={revenueData.totalOrders}
                    aov={revenueData.aov}
                    currency={currency}
                  />
                )}
                {ordersData && ordersData.byStatus.length > 0 && (
                  <OrdersChart byStatus={ordersData.byStatus} total={ordersData.total} />
                )}
                {topProductsData && (
                  <TopProductsTable
                    products={topProductsData.products}
                    lowStock={businessType === 'ecommerce' ? topProductsData.lowStock : []}
                    currency={currency}
                    label={businessType === 'infobiz' ? 'Top Info Products' : 'Top Products'}
                  />
                )}
              </>
            )}

            {/* Booking */}
            {businessType === 'booking' && bookingData && (
              <BookingMetrics
                total={bookingData.total}
                confirmed={bookingData.confirmed}
                cancelled={bookingData.cancelled}
                cancellationRate={bookingData.cancellationRate}
                topServices={bookingData.topServices}
                upcoming={bookingData.upcoming}
                trend={bookingData.trend}
              />
            )}
          </div>
        )
      )}
    </div>
  );
}
