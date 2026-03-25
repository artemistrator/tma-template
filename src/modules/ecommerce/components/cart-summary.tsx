'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useCartStore } from '@/store/cart-store';
import { useTelegramContext } from '@/lib/telegram/telegram-provider';
import { useAppConfig } from '@/context/app-config-context';

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
 * Displays subtotal, discount, and total with real promo code validation
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
  const showSubtotal = props?.showSubtotal ?? directShowSubtotal;
  const showDiscount = props?.showDiscount ?? directShowDiscount;
  const showTotal = props?.showTotal ?? directShowTotal;
  const promoCodeEnabled = props?.promoCodeEnabled ?? directPromoCodeEnabled;
  const checkoutAction = props?.onCheckout ?? onCheckout;

  const items = useCartStore((state) => state.items);
  const promoCode = useCartStore((state) => state.promoCode);
  const discountAmount = useCartStore((state) => state.discountAmount);
  const applyPromoCode = useCartStore((state) => state.applyPromoCode);
  const removePromo = useCartStore((state) => state.removePromo);
  const totalFromStore = useCartStore((state) => state.total);
  const { hapticFeedback } = useTelegramContext();
  const { config } = useAppConfig();

  const [promoInput, setPromoInput] = React.useState('');
  const [promoError, setPromoError] = React.useState('');
  const [promoLoading, setPromoLoading] = React.useState(false);

  const subtotal = items.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0);
  const displayTotal = totalFromStore > 0 ? totalFromStore : subtotal - discountAmount;

  const handleApplyPromo = async () => {
    hapticFeedback.impact('light');
    const code = promoInput.trim();
    if (code.length < 3) {
      setPromoError('Promo code must be at least 3 characters');
      return;
    }

    setPromoLoading(true);
    setPromoError('');

    try {
      const tenantId = config?.meta?.slug || 'default';
      const response = await fetch('/api/promo/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, tenantId, orderTotal: subtotal }),
      });
      const data = await response.json();

      if (data.valid) {
        applyPromoCode(data.code, data.discountAmount);
        hapticFeedback.success();
      } else {
        setPromoError(data.error || 'Invalid promo code');
        hapticFeedback.error();
      }
    } catch {
      setPromoError('Failed to validate promo code');
      hapticFeedback.error();
    } finally {
      setPromoLoading(false);
    }
  };

  const handleRemovePromo = () => {
    hapticFeedback.impact('light');
    removePromo();
    setPromoInput('');
    setPromoError('');
  };

  const handleCheckout = () => {
    hapticFeedback.impact('medium');
    if (typeof checkoutAction === 'string' && checkoutAction.startsWith('navigate:')) {
      const targetPage = checkoutAction.split(':')[1];
      onNavigate?.(targetPage);
    }
  };

  const hasItems = items.length > 0;
  const hasCheckout = !!checkoutAction;

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

        {showDiscount && discountAmount > 0 && (
          <div className="flex justify-between text-sm text-success-foreground">
            <span>Discount {promoCode && `(${promoCode})`}</span>
            <span>-${discountAmount.toFixed(2)}</span>
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
              onKeyDown={(e) => e.key === 'Enter' && handleApplyPromo()}
              className="flex-1"
            />
            <Button
              onClick={handleApplyPromo}
              variant="outline"
              disabled={promoLoading}
            >
              {promoLoading ? '...' : 'Apply'}
            </Button>
          </div>
        )}

        {promoError && (
          <p className="text-sm text-destructive">{promoError}</p>
        )}

        {promoCode && (
          <div className="flex items-center justify-between p-3 bg-success-bg text-success-foreground rounded-lg">
            <span className="text-sm">Promo applied: {promoCode}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRemovePromo}
              className="h-auto p-1"
            >
              ✕
            </Button>
          </div>
        )}

        {showTotal && (
          <div className="border-t pt-4 flex justify-between items-center">
            <span className="text-lg font-semibold">Total</span>
            <span className="text-2xl font-bold">${Math.max(0, displayTotal).toFixed(2)}</span>
          </div>
        )}

        {hasCheckout && (
          <Button
            className="w-full mt-4"
            size="lg"
            onClick={handleCheckout}
            disabled={!hasItems}
          >
            {hasItems ? 'Continue to Payment' : 'Add items to cart'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
