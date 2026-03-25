'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { cn } from '@/lib/utils';
import { Order } from '@/store/cart-store';
import { useTelegramContext } from '@/lib/telegram/telegram-provider';
import { useCartStore } from '@/store/cart-store';
import { useAppConfig } from '@/context/app-config-context';
import { useOrderStatusSync } from '@/lib/hooks/use-order-status-sync';
import Image from 'next/image';

interface OrderDetailsProps {
 orderId?: string;
 order?: Order;
 onBack?: () => void;
 onReorder?: () => void;
 onNavigate?: (pageId: string) => void;
}

// statusLabels built dynamically via t() — see inside OrderDetails

/**
 * OrderDetails - Detailed order view
 */
export function OrderDetails({ orderId: propOrderId, order, onBack, onReorder, onNavigate }: OrderDetailsProps) {
 const { hapticFeedback } = useTelegramContext();
 const { config } = useAppConfig();

 const ordersFromStore = useCartStore((state) => state.orders);
 const updateOrderStatus = useCartStore((state) => state.updateOrderStatus);
 const [orderId, setOrderId] = useState<string | undefined>(propOrderId);

 // Sync order statuses with server
 useOrderStatusSync();
 const [isCancelling, setIsCancelling] = useState(false);

 // Extract orderId from URL hash if not provided as prop
 useEffect(() => {
  const getOrderIdFromHash = () => {
    const hash = window.location.hash;
    const match = hash.match(/order-details\?orderId=([^&]+)/);
    if (match) {
      return match[1];
    }
    return undefined;
  };

  // Set initial value
  const hashOrderId = getOrderIdFromHash();
  if (hashOrderId) {
    setOrderId(hashOrderId);
  }

  // Listen for hash changes
  const handleHashChange = () => {
    const newOrderId = getOrderIdFromHash();
    if (newOrderId) {
      setOrderId(newOrderId);
    }
  };

  window.addEventListener('hashchange', handleHashChange);
  return () => window.removeEventListener('hashchange', handleHashChange);
 }, []);

 // Find order by ID from props or fallback to store
 const foundOrder = order || (orderId ? ordersFromStore.find(o => o.id === orderId) : ordersFromStore[0]);

 if (!foundOrder) {
   return (
     <div className="text-center py-12">
       <p className="text-muted-foreground">Order not found</p>
     </div>
   );
  }

  const handleBack = () => {
    hapticFeedback.impact('light');
    if (onBack) {
      onBack();
    } else if (onNavigate) {
      onNavigate('orders');
      window.location.hash = 'orders';
    } else {
      window.location.hash = 'orders';
    }
  };

  const handleReorder = () => {
    hapticFeedback.impact('medium');
    onReorder?.();
  };

  const handleCancelBooking = async () => {
    if (!foundOrder.bookingDate) return;
    const confirmed = window.confirm('Вы уверены, что хотите отменить запись?');
    if (!confirmed) return;
    hapticFeedback.impact('medium');
    setIsCancelling(true);
    try {
      const response = await fetch(`/api/bookings/${foundOrder.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled', tenantId: config?.meta?.slug || 'barber' }),
      });
      const data = await response.json();
      if (data.success) {
        updateOrderStatus(foundOrder.id, 'cancelled');
        hapticFeedback.success();
      } else {
        hapticFeedback.error();
      }
    } catch {
      hapticFeedback.error();
    } finally {
      setIsCancelling(false);
    }
  };

 return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Order #{foundOrder.id}</h2>
          <p className="text-sm text-muted-foreground">
            {new Date(foundOrder.createdAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
        <StatusBadge status={foundOrder.status} />
      </div>

      {/* Order Items */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Order Items</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {foundOrder.items.map((item) => (
            <div
              key={item.id}
              className="flex gap-4 p-4 rounded-lg bg-muted/50"
            >
              {item.image ? (
               <Image
                 src={item.image}
                 alt={item.name}
                 width={80}
                 height={80}
                 unoptimized
                 className="rounded-md object-cover"
               />
              ) : (
                <div className="w-20 h-20 rounded-md bg-muted flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-muted-foreground"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
              )}
              <div className="flex-1">
                <h3 className="font-semibold">{item.name}</h3>
                {(item as { variantName?: string }).variantName && (
                  <p className="text-xs text-muted-foreground">
                    {(item as { variantName?: string }).variantName}
                  </p>
                )}
                <p className="text-sm text-muted-foreground">
                  Quantity: {item.quantity}
                </p>
                <p className="font-semibold mt-1">
                  ${Number(item.price).toFixed(2)} × {item.quantity} = ${(Number(item.price) * Number(item.quantity)).toFixed(2)}
                </p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Booking Details (for booking-type orders) */}
      {foundOrder.bookingDate && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Appointment Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              {foundOrder.bookingService && (
                <p><span className="font-medium">Service:</span> {foundOrder.bookingService}</p>
              )}
              <p>
                <span className="font-medium">Date:</span>{' '}
                {new Date(foundOrder.bookingDate).toLocaleDateString('ru-RU', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
              <p>
                <span className="font-medium">Time:</span>{' '}
                {foundOrder.bookingTime || foundOrder.bookingDate.split('T')[1]?.slice(0, 5)}
              </p>
              {foundOrder.shippingAddress?.name && (
                <p><span className="font-medium">Name:</span> {foundOrder.shippingAddress.name}</p>
              )}
              {foundOrder.shippingAddress?.phone && (
                <p><span className="font-medium">Phone:</span> {foundOrder.shippingAddress.phone}</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Shipping Address (for ecommerce orders only) */}
      {!foundOrder.bookingDate && foundOrder.shippingAddress && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Shipping Address</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 text-sm">
              <p><span className="font-medium">Name:</span> {foundOrder.shippingAddress.name}</p>
              <p><span className="font-medium">Phone:</span> {foundOrder.shippingAddress.phone}</p>
              <p><span className="font-medium">Address:</span> {foundOrder.shippingAddress.address}</p>
              {foundOrder.shippingAddress.city && (
                <p><span className="font-medium">City:</span> {foundOrder.shippingAddress.city}</p>
              )}
              {foundOrder.shippingAddress.zipCode && (
                <p><span className="font-medium">ZIP:</span> {foundOrder.shippingAddress.zipCode}</p>
              )}
              {foundOrder.shippingAddress.country && (
                <p><span className="font-medium">Country:</span> {foundOrder.shippingAddress.country}</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Order Summary (ecommerce only) */}
      {!foundOrder.bookingDate && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Order Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">${foundOrder.total.toFixed(2)}</span>
              </div>
              <div className="border-t pt-2 flex justify-between text-lg font-semibold">
                <span>Total</span>
                <span>${foundOrder.total.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button onClick={handleBack} variant="outline" className="flex-1">
          Back to Orders
        </Button>
        {foundOrder.status === 'delivered' && (
          <Button onClick={handleReorder} className="flex-1">
            Reorder
          </Button>
        )}
        {foundOrder.bookingDate && (foundOrder.status === 'pending' || foundOrder.status === 'confirmed') && (
          <Button
            onClick={handleCancelBooking}
            variant="destructive"
            className="flex-1"
            disabled={isCancelling}
          >
            {isCancelling ? 'Cancelling...' : 'Cancel Booking'}
          </Button>
        )}
      </div>
    </div>
  );
}
