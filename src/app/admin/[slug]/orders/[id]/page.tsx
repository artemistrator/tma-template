'use client';

import { useState, useEffect } from 'react';
import { useAdmin, useAdminFetch } from '@/lib/admin/admin-context';
import { useParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/admin/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import {
  ORDER_TRANSITIONS,
  BOOKING_TRANSITIONS,
} from '@/components/admin/status-config';

interface OrderDetail {
  id: string | number;
  customer_name: string;
  customer_phone?: string;
  customer_email?: string;
  total?: number;
  status: string;
  items?: Array<{ product_id: string | number; quantity: number; price: number }>;
  shipping_address?: { address?: string; city?: string; zipCode?: string; country?: string };
  date?: string;
  service_id?: string;
  staff_id?: string;
  notes?: string;
  created_at: string;
}

function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
  if (!value) return null;
  return (
    <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right max-w-[60%] break-words">{value}</span>
    </div>
  );
}

export default function OrderDetailPage() {
  const { admin } = useAdmin();
  const adminFetch = useAdminFetch();
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const id = params.id as string;

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [collection, setCollection] = useState('orders');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!admin) return;
    adminFetch(`/orders/${id}`).then((data) => {
      if (data.success) {
        setOrder(data.item);
        setCollection(data.collection || 'orders');
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [admin, adminFetch, id]);

  async function updateStatus(newStatus: string) {
    setUpdating(true);
    const data = await adminFetch(`/orders/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: newStatus }),
    });
    if (data.success && data.item) {
      setOrder(data.item);
    }
    setUpdating(false);
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-6 bg-gray-200 dark:bg-gray-800 rounded w-32 animate-pulse" />
        <div className="h-40 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!order) {
    return <p className="text-muted-foreground">Order not found</p>;
  }

  const isBooking = collection === 'bookings';
  const transitions = isBooking ? BOOKING_TRANSITIONS : ORDER_TRANSITIONS;
  const nextStatuses = transitions[order.status] || [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push(`/admin/${slug}/orders`)}
          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <PageHeader
          title={`${isBooking ? 'Booking' : 'Order'} #${order.id}`}
          description={new Date(order.created_at).toLocaleString()}
        />
      </div>

      {/* Status + actions */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-muted-foreground">Status</span>
          <StatusBadge status={order.status} />
        </div>
        {nextStatuses.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {nextStatuses.map((s) => (
              <Button
                key={s}
                size="sm"
                variant={s === 'cancelled' ? 'destructive' : 'outline'}
                onClick={() => updateStatus(s)}
                loading={updating}
              >
                Mark {s}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Customer info */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
        <h2 className="text-sm font-medium mb-2">Customer</h2>
        <InfoRow label="Name" value={order.customer_name} />
        <InfoRow label="Phone" value={order.customer_phone} />
        <InfoRow label="Email" value={order.customer_email} />
      </div>

      {/* Order-specific details */}
      {!isBooking && (
        <>
          {/* Items */}
          {order.items && order.items.length > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
              <h2 className="text-sm font-medium mb-2">Items</h2>
              {order.items.map((item, i) => (
                <div key={i} className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
                  <span className="text-sm">Item #{item.product_id} x{item.quantity}</span>
                  <span className="text-sm font-medium">{(item.price * item.quantity).toLocaleString()}</span>
                </div>
              ))}
              {order.total !== undefined && (
                <div className="flex justify-between pt-2 mt-1">
                  <span className="text-sm font-medium">Total</span>
                  <span className="text-base font-semibold">{order.total.toLocaleString()}</span>
                </div>
              )}
            </div>
          )}

          {/* Shipping */}
          {order.shipping_address && (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
              <h2 className="text-sm font-medium mb-2">Shipping Address</h2>
              <InfoRow label="Address" value={order.shipping_address.address} />
              <InfoRow label="City" value={order.shipping_address.city} />
              <InfoRow label="ZIP" value={order.shipping_address.zipCode} />
              <InfoRow label="Country" value={order.shipping_address.country} />
            </div>
          )}
        </>
      )}

      {/* Booking-specific details */}
      {isBooking && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
          <h2 className="text-sm font-medium mb-2">Booking Details</h2>
          <InfoRow label="Date" value={order.date} />
          <InfoRow label="Service ID" value={order.service_id} />
          <InfoRow label="Staff ID" value={order.staff_id} />
          <InfoRow label="Notes" value={order.notes} />
        </div>
      )}
    </div>
  );
}
