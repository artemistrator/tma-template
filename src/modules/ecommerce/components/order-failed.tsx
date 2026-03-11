'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTelegramContext } from '@/lib/telegram/telegram-provider';
import { BottomNav } from '@/components/core/bottom-nav';

interface OrderFailedProps {
  error?: string;
  onRetry?: () => void;
  onBack?: () => void;
}

/**
 * OrderFailed - Order failure page
 * Displayed when order placement fails
 */
export function OrderFailed({ error, onRetry, onBack }: OrderFailedProps) {
  const { hapticFeedback } = useTelegramContext();

  React.useEffect(() => {
    hapticFeedback.error();
  }, [hapticFeedback]);

  const handleRetry = () => {
    hapticFeedback.impact('light');
    onRetry?.();
  };

  const handleBack = () => {
    hapticFeedback.impact('light');
    onBack?.();
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-4 py-3">
          <h1 className="text-xl font-semibold">Order Failed</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="max-w-md mx-auto">
          {/* Error Icon */}
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-red-100 flex items-center justify-center">
            <svg
              className="w-12 h-12 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>

          {/* Error Message */}
          <Card className="mb-6">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-2xl text-destructive">Oops!</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-muted-foreground">
                Something went wrong while placing your order.
              </p>

              {error && (
                <div className="p-4 bg-destructive/10 rounded-lg text-destructive text-sm">
                  <p className="font-semibold mb-1">Error:</p>
                  <p>{error}</p>
                </div>
              )}

              <div className="text-left p-4 bg-yellow-50 text-yellow-800 rounded-lg text-sm">
                <p className="font-semibold mb-2">Don&apos;t worry!</p>
                <p>Your cart has been saved. You can try again or continue shopping.</p>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="space-y-3">
            <Button className="w-full" size="lg" onClick={handleRetry}>
              Try Again
            </Button>
            
            <Button variant="outline" className="w-full" onClick={handleBack}>
              Back to Cart
            </Button>
          </div>
        </div>
      </main>

      <BottomNav currentPage="cart" onNavigate={onBack || (() => {})} />
    </div>
  );
}
