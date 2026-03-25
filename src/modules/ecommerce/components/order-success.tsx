'use client';

import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTelegramContext } from '@/lib/telegram/telegram-provider';
import { BottomNav } from '@/components/core/bottom-nav';

interface OrderSuccessProps {
  orderId?: string;
  total?: number;
  onContinue?: () => void;
  onNavigate?: (pageId: string) => void;
}

/**
 * OrderSuccess - Order confirmation page
 * Displayed after successful order placement
 */
export function OrderSuccess({ orderId, total, onContinue, onNavigate }: OrderSuccessProps) {
  const { hapticFeedback } = useTelegramContext();

  useEffect(() => {
    hapticFeedback.success();
  }, [hapticFeedback]);

  const handleContinue = () => {
    hapticFeedback.impact('light');
    if (onContinue) {
      onContinue();
    } else if (onNavigate) {
      onNavigate('home');
    }
  };

  const handleViewOrders = () => {
    hapticFeedback.impact('light');
    if (onNavigate) {
      onNavigate('orders');
    } else if (onContinue) {
      onContinue();
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-4 py-3">
          <h1 className="text-xl font-semibold">Order Confirmed!</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="max-w-md mx-auto">
          {/* Success Icon */}
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-success-bg flex items-center justify-center">
            <svg
              className="w-12 h-12 text-success-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          {/* Success Message */}
          <Card className="mb-6">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-2xl">Thank You!</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-muted-foreground">
                Your order has been placed successfully.
              </p>

              {orderId && (
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Order ID</p>
                  <p className="font-mono font-bold text-lg">{orderId}</p>
                </div>
              )}

              {total && (
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Total Amount</p>
                  <p className="font-bold text-2xl">${total.toFixed(2)}</p>
                </div>
              )}

              <div className="text-left p-4 bg-info-bg text-info-foreground rounded-lg text-sm">
                <p className="font-semibold mb-2">What&apos;s next?</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>We&apos;ll send you a confirmation</li>
                  <li>Prepare your order</li>
                  <li>Ship it to your address</li>
                  <li>Send tracking information</li>
                </ol>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="space-y-3">
            <Button className="w-full" size="lg" onClick={handleContinue}>
              Continue Shopping
            </Button>
            
            <Button variant="outline" className="w-full" onClick={handleViewOrders}>
              View Order History
            </Button>
          </div>
        </div>
      </main>

      <BottomNav currentPage="home" onNavigate={onNavigate || onContinue || (() => {})} />
    </div>
  );
}
