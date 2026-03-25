'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState, emptyIcon } from '@/components/ui/empty-state';
import { useCartStore } from '@/store/cart-store';
import { useTranslation } from '@/lib/use-translation';
import { useOrderStatusSync } from '@/lib/hooks/use-order-status-sync';

interface OrderItem {
  id: string;
  name: string;
  price: number;
  image?: string;
  quantity?: number;
}

interface Order {
  id: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  total: number;
  items: OrderItem[];
  createdAt: string;
  deliveryAddress?: string;
}

interface OrdersListProps {
  id?: string;
  title?: string;
  description?: string;
  orders?: Order[];
  props?: {
   orders?: Order[];
   title?: string;
   description?: string;
   showUserOrdersOnly?: boolean;
   onOrderClick?: string | ((orderId: string) => void);
  };
  onOrderClick?: (orderId: string) => void;
  onReorder?: (orderId: string) => void;
  className?: string;
  emptyMessage?: string;
  showUserOrdersOnly?: boolean;
  onNavigate?: (pageId: string) => void;
}

// statusLabels built per-render via t() — see inside OrdersList

/**
 * OrdersList - List of order cards
 * Displays order history with status and details
 */
export function OrdersList({
  id,
  title = 'My Orders',
 description,
 orders: directOrders,
 props,
  onOrderClick,
  onReorder,
  className,
  emptyMessage = "No orders yet",
  showUserOrdersOnly: showUserOrdersOnlyProp = false,
  onNavigate,
}: OrdersListProps) {
 const ordersFromStore = useCartStore((state) => state.orders);
 const addItem = useCartStore((state) => state.addItem);
 const { t } = useTranslation();

 // Sync order statuses with server
 useOrderStatusSync();

 const statusLabels: Record<Order['status'] | 'confirmed', string> = {
   pending: t('status.pending'),
   processing: t('status.processing'),
   shipped: t('status.shipped'),
   delivered: t('status.delivered'),
   cancelled: t('status.cancelled'),
   confirmed: t('status.confirmed'),
 };

 // Use store orders if showUserOrdersOnly is true (check both direct prop and nested props)
 const showUserOrdersOnly = props?.showUserOrdersOnly ?? showUserOrdersOnlyProp;
 const orders = showUserOrdersOnly ? ordersFromStore : (props?.orders || directOrders || []);

 // Handle onOrderClick - can be string (navigate:) or function
 const handleOrderClick = (orderId: string) => {
  // Check if onOrderClick is a navigate string
  const navigateString = typeof onOrderClick === 'string' ? onOrderClick : props?.onOrderClick;
  const customHandler = typeof onOrderClick === 'function' ? onOrderClick : undefined;
  
  if (typeof navigateString === 'string' && navigateString.startsWith('navigate:')) {
    // Extract pageId from navigate:pageId
    const pageId = navigateString.split(':')[1];
    // Append orderId as hash parameter for details page
    if (pageId === 'order-details') {
      window.location.hash = `${pageId}?orderId=${orderId}`;
    } else {
      window.location.hash = pageId;
    }
    onNavigate?.(pageId);
  } else if (customHandler) {
    customHandler(orderId);
  } else if (onNavigate) {
    // Default behavior: navigate to order-details with orderId
    window.location.hash = `order-details?orderId=${orderId}`;
    onNavigate('order-details');
  }
 };
 
 const pageTitle = props?.title || title;
 const pageDescription = props?.description || description;

  if (orders.length === 0) {
    return (
      <EmptyState
        icon={emptyIcon('orders')}
        title={emptyMessage}
        description="They will appear here once you make a purchase"
        action={onNavigate ? { label: 'Browse catalog →', onClick: () => onNavigate('catalog') } : undefined}
        className={cn(className)}
      />
    );
  }

  return (
    <div className={cn("space-y-4", className)} id={id}>
      {(pageTitle || pageDescription) && (
        <div className="mb-4">
          {pageTitle && <h2 className="text-xl font-bold">{pageTitle}</h2>}
          {pageDescription && (
            <p className="text-muted-foreground">{pageDescription}</p>
          )}
        </div>
      )}

      <div className="space-y-3">
        {orders.map((order) => (
         <Card
           key={order.id}
           className="overflow-hidden cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={() => handleOrderClick(order.id)}
         >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">Order #{order.id}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(order.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                </div>
                <StatusBadge status={order.status} size="sm" />
              </div>
            </CardHeader>

            <CardContent className="space-y-3">
              {/* Order items preview */}
              <div className="flex gap-3 overflow-x-auto pb-2">
                {order.items.slice(0, 4).map((item, index) => (
                  <div key={index} className="flex-shrink-0 w-16 h-16 rounded-md bg-muted overflow-hidden">
                   {item.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                    />
                   ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <svg
                          className="w-6 h-6"
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
                  </div>
                ))}
                {order.items.length > 4 && (
                  <div className="flex-shrink-0 w-16 h-16 rounded-md bg-muted flex items-center justify-center text-sm text-muted-foreground">
                    +{order.items.length - 4}
                  </div>
                )}
              </div>

              {/* Order summary */}
              <div className="flex items-center justify-between pt-2 border-t">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {order.items.length} {order.items.length === 1 ? 'item' : 'items'}
                  </p>
                  <p className="font-semibold">${order.total.toFixed(2)}</p>
                </div>
                <div className="flex gap-2">
                  {/* Ecommerce reorder (delivered) */}
                  {order.status === 'delivered' && !('bookingService' in order) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        order.items.forEach((item) => addItem(item));
                        onReorder?.(order.id);
                        if (onNavigate) {
                          onNavigate('cart');
                        } else {
                          window.location.hash = 'cart';
                        }
                      }}
                    >
                      Reorder
                    </Button>
                  )}
                  {/* Booking: book again for confirmed/delivered bookings */}
                  {(order as unknown as { bookingService?: string }).bookingService && (order.status === 'confirmed' || order.status === 'delivered') && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Pre-select the same service in sessionStorage for catalog
                        if (typeof window !== 'undefined') {
                          const serviceId = order.items[0]?.id;
                          if (serviceId) {
                            sessionStorage.setItem('booking_preselect_service', serviceId);
                          }
                        }
                        if (onNavigate) {
                          onNavigate('catalog');
                        } else {
                          window.location.hash = 'catalog';
                        }
                      }}
                    >
                      Book again
                    </Button>
                  )}
                  <Button size="sm" onClick={(e) => {
                   e.stopPropagation();
                  handleOrderClick(order.id);
                 }}>Details</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
