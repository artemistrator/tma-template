'use client';

import React from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useCartStore, CartItem } from '@/store/cart-store';
import { useTelegramContext } from '@/lib/telegram/telegram-provider';
import { Minus, Plus, Trash2 } from 'lucide-react';

interface CartProps {
  id?: string;
  showEmpty?: boolean;
  emptyMessage?: string;
  onCheckout?: () => void;
  onProductClick?: (productId: string) => void;
  className?: string;
}

/**
 * Cart - Shopping cart items list
 * Displays cart items with quantity controls
 */
export function Cart({
  id,
  showEmpty = true,
  emptyMessage = "Your cart is empty",
  onCheckout,
  onProductClick,
  className,
}: CartProps) {
  const items = useCartStore((state) => state.items);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const { hapticFeedback } = useTelegramContext();

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _onCheckout = onCheckout; // Reserved for future use

  const handleIncrease = (item: CartItem) => {
    hapticFeedback.impact('light');
    updateQuantity(item.id, item.quantity + 1);
  };

  const handleDecrease = (item: CartItem) => {
    hapticFeedback.impact('light');
    updateQuantity(item.id, item.quantity - 1);
  };

  const handleRemove = (item: CartItem) => {
    hapticFeedback.warning();
    removeItem(item.id);
  };

  if (items.length === 0) {
    if (!showEmpty) return null;
    
    return (
      <div className={cn("text-center py-12", className)} id={id}>
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
          <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
        </div>
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)} id={id}>
      {items.map((item) => (
        <Card key={item.id} className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex gap-4">
              {item.image && (
                <div
                  className="w-20 h-20 rounded-md bg-cover bg-center flex-shrink-0 cursor-pointer"
                  style={{ backgroundImage: `url(${item.image})` }}
                  onClick={() => onProductClick?.(item.id)}
                />
              )}
              
              <div className="flex-1 min-w-0">
                <h3
                  className="font-semibold truncate cursor-pointer"
                  onClick={() => onProductClick?.(item.id)}
                >
                  {item.name}
                </h3>
                {item.category && (
                  <p className="text-sm text-muted-foreground">{item.category}</p>
                )}
                <p className="text-lg font-bold mt-1">
                  ${(item.price * item.quantity).toFixed(2)}
                </p>
              </div>
              
              <div className="flex flex-col items-end gap-2">
                <Badge variant="secondary">{item.quantity} pcs</Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => handleRemove(item)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
          
          <CardFooter className="p-4 pt-0 flex justify-end">
            <div className="flex items-center gap-2 border rounded-lg p-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleDecrease(item)}
                disabled={item.quantity <= 1}
              >
                <Minus className="w-4 h-4" />
              </Button>
              <span className="w-8 text-center font-medium">{item.quantity}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleIncrease(item)}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
