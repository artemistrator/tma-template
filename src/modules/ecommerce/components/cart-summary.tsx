'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useCartStore } from '@/store/cart-store';
import { useTelegramContext } from '@/lib/telegram/telegram-provider';

interface CartSummaryProps {
  id?: string;
  showSubtotal?: boolean;
  showDiscount?: boolean;
  showTotal?: boolean;
  promoCodeEnabled?: boolean;
  onCheckout?: () => void;
  className?: string;
  props?: {
    showSubtotal?: boolean;
    showDiscount?: boolean;
    showTotal?: boolean;
    promoCodeEnabled?: boolean;
    onCheckout?: string;
  };
  onNavigate?: (pageId: string) => void;
}

/**
 * CartSummary - Cart totals and summary component
 * Displays subtotal, discount, and total with optional promo code input
 */
export function CartSummary({
  id,
  showSubtotal: directShowSubtotal = true,
  showDiscount: directShowDiscount = true,
  showTotal: directShowTotal = true,
  promoCodeEnabled: directPromoCodeEnabled = true,
  onCheckout,
  className,
  props,
  onNavigate,
}: CartSummaryProps) {
  // Support both direct props and nested props from schema
  const showSubtotal = props?.showSubtotal ?? directShowSubtotal;
  const showDiscount = props?.showDiscount ?? directShowDiscount;
  const showTotal = props?.showTotal ?? directShowTotal;
  const promoCodeEnabled = props?.promoCodeEnabled ?? directPromoCodeEnabled;
  const checkoutAction= props?.onCheckout ?? onCheckout;

  const items = useCartStore((state) => state.items);
  const promoCode = useCartStore((state) => state.promoCode);
  const applyPromoCode = useCartStore((state) => state.applyPromoCode);
  const { hapticFeedback } = useTelegramContext();

  const [promoInput, setPromoInput] = React.useState('');
  const [promoError, setPromoError] = React.useState('');

  // Debug logging
  React.useEffect(() => {
  console.log('CartSummary - onCheckout:', checkoutAction);
  console.log('CartSummary - items.length:', items.length);
  console.log('CartSummary - should show button:', !!checkoutAction && items.length > 0);
  }, [checkoutAction, items.length]);

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discount = promoCode ? subtotal * 0.1 : 0; // 10% discount example
  const total = subtotal - discount;

  const handleApplyPromo = () => {
    hapticFeedback.impact('light');

    // Simple validation - in real app, validate via API
    if (promoInput.trim().length < 3) {
      setPromoError('Promo code must be at least 3 characters');
      return;
    }

    applyPromoCode(promoInput.trim());
    setPromoError('');
  };

  const handleCheckout = () => {
    hapticFeedback.impact('medium');

    // Handle navigation string like "navigate:checkout"
    if (typeof checkoutAction === 'string' && checkoutAction.startsWith('navigate:')) {
      const targetPage = checkoutAction.split(':')[1];
      onNavigate?.(targetPage);
    }
  };

  return (
    <Card className={cn("", className)} id={id}>
      <CardHeader>
        <CardTitle className="text-lg">Order Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {showSubtotal && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-medium">${subtotal.toFixed(2)}</span>
          </div>
        )}

        {showDiscount && discount > 0 && (
          <div className="flex justify-between text-sm text-green-600">
            <span>Discount {promoCode && `( ${promoCode} )`}</span>
            <span>-${discount.toFixed(2)}</span>
          </div>
        )}

        {promoCodeEnabled && !promoCode && (
          <div className="flex gap-2">
            <Input
              placeholder="Promo code"
              value={promoInput}
              onChange={(e) => {
                setPromoInput(e.target.value);
                setPromoError('');
              }}
              className="flex-1"
            />
            <Button onClick={handleApplyPromo} variant="outline">
              Apply
            </Button>
          </div>
        )}

        {promoError && (
          <p className="text-sm text-destructive">{promoError}</p>
        )}

        {promoCode && (
          <div className="flex items-center justify-between p-3 bg-green-50 text-green-700 rounded-lg">
            <span className="text-sm">Promo code applied: {promoCode}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => applyPromoCode('')}
              className="h-auto p-1"
            >
              ✕
            </Button>
          </div>
        )}

        {showTotal && (
          <div className="border-t pt-4 flex justify-between items-center">
            <span className="text-lg font-semibold">Total</span>
            <span className="text-2xl font-bold">${total.toFixed(2)}</span>
          </div>
        )}

        {/* Checkout button */}
        {checkoutAction && (
         <Button
         className="w-full mt-4 bg-blue-600 hover:bg-blue-700"
           size="lg"
         onClick={handleCheckout}
           disabled={items.length === 0}
       >
         Continue to Payment
       </Button>
     )}
   </CardContent>
    </Card>
  );
}
