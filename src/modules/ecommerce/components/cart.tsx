'use client';

import React from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useCartStore, CartItem } from '@/store/cart-store';
import { useTelegramContext } from '@/lib/telegram/telegram-provider';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { EmptyState, emptyIcon } from '@/components/ui/empty-state';

interface CartProps {
  id?: string;
  showEmpty?: boolean;
  emptyMessage?: string;
  onCheckout?: () => void;
  onProductClick?: (productId: string) => void;
  className?: string;
  props?: {
    showEmpty?: boolean;
    emptyMessage?: string;
  };
  showMockData?: boolean;
}

function CartItemImage({ src, alt, onClick }: { src: string; alt: string; onClick?: () => void }) {
  const [errored, setErrored] = React.useState(false);

  if (errored) {
    return (
      <div
        className="w-20 h-20 rounded-md bg-muted flex-shrink-0 flex items-center justify-center cursor-pointer"
        onClick={onClick}
      >
        <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className="w-20 h-20 rounded-md object-cover flex-shrink-0 cursor-pointer"
      onError={() => setErrored(true)}
      onClick={onClick}
    />
  );
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
      <EmptyState
        icon={emptyIcon('cart')}
        title={emptyMessage}
        className={className}
      />
    );
  }

  return (
    <div className={cn("space-y-3", className)} id={id}>
      {items.map((item) => (
        <Card key={item.id} className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex gap-4">
              {item.image && (
                <CartItemImage
                  src={item.image}
                  alt={item.name}
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
                {item.variantName && (
                  <p className="text-xs text-muted-foreground capitalize">{item.variantName}</p>
                )}
                {!item.variantName && item.category && (
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
                disabled={
                  item.stockQuantity !== undefined &&
                  item.stockQuantity > 0 &&
                  item.quantity >= item.stockQuantity
                }
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
