'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

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
  };
  onOrderClick?: (orderId: string) => void;
  onReorder?: (orderId: string) => void;
  className?: string;
  emptyMessage?: string;
}

const statusColors: Record<Order['status'], string> = {
  pending: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  processing: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  shipped: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  delivered: 'bg-green-500/10 text-green-500 border-green-500/20',
  cancelled: 'bg-red-500/10 text-red-500 border-red-500/20',
};

const statusLabels: Record<Order['status'], string> = {
  pending: 'Pending',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

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
}: OrdersListProps) {
  const orders = props?.orders || directOrders || [];
  const pageTitle = props?.title || title;
  const pageDescription = props?.description || description;

  if (orders.length === 0) {
    return (
      <div className={cn("text-center py-12", className)} id={id}>
        <div className="mb-4">
          <svg
            className="w-16 h-16 mx-auto text-muted-foreground/50"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
            />
          </svg>
        </div>
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
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
            onClick={() => onOrderClick?.(order.id)}
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
                <Badge
                  variant="outline"
                  className={cn(statusColors[order.status], 'font-medium')}
                >
                  {statusLabels[order.status]}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-3">
              {/* Order items preview */}
              <div className="flex gap-3 overflow-x-auto pb-2">
                {order.items.slice(0, 4).map((item, index) => (
                  <div key={index} className="flex-shrink-0 w-16 h-16 rounded-md bg-muted overflow-hidden">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover"
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
                  {order.status === 'delivered' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onReorder?.(order.id);
                      }}
                    >
                      Reorder
                    </Button>
                  )}
                  <Button size="sm">Details</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
