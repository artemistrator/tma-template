'use client';

import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTelegramContext } from '@/lib/telegram/telegram-provider';
import { useCartStore } from '@/store/cart-store';

interface BookingSuccessProps {
  id?: string;
  className?: string;
  onNavigate?: (pageId: string) => void;
}

/**
 * BookingSuccess — shown after a successful booking.
 * Reads the last order from store (which has bookingDate, bookingTime, bookingService).
 */
export function BookingSuccess({ id, className, onNavigate }: BookingSuccessProps) {
  const { hapticFeedback } = useTelegramContext();
  const orders = useCartStore((state) => state.orders);

  // The most recently added booking is orders[0]
  const lastBooking = orders[0];

  useEffect(() => {
    hapticFeedback.success();
  }, [hapticFeedback]);

  const formattedDate = lastBooking?.bookingDate
    ? new Date(lastBooking.bookingDate).toLocaleDateString('ru-RU', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  const formattedTime = lastBooking?.bookingTime
    ?? lastBooking?.bookingDate?.split('T')[1]?.slice(0, 5)
    ?? null;

  return (
    <div className={className} id={id}>
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 py-12 text-center">
        {/* Success icon */}
        <div className="w-20 h-20 rounded-full bg-success-bg flex items-center justify-center mb-6">
          <svg className="w-10 h-10 text-success-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold mb-2">Запись подтверждена!</h1>
        <p className="text-muted-foreground mb-8">Мы ждём вас. До встречи!</p>

        {/* Booking details card */}
        {lastBooking && (
          <Card className="w-full max-w-sm mb-8 text-left">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Детали записи</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {lastBooking.bookingService && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Услуга</span>
                  <span className="font-medium">{lastBooking.bookingService}</span>
                </div>
              )}
              {formattedDate && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Дата</span>
                  <span className="font-medium capitalize">{formattedDate}</span>
                </div>
              )}
              {formattedTime && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Время</span>
                  <span className="font-medium">{formattedTime}</span>
                </div>
              )}
              {lastBooking.shippingAddress?.name && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Имя</span>
                  <span className="font-medium">{lastBooking.shippingAddress.name}</span>
                </div>
              )}
              {lastBooking.shippingAddress?.phone && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Телефон</span>
                  <span className="font-medium">{lastBooking.shippingAddress.phone}</span>
                </div>
              )}
              <div className="flex justify-between pt-1 border-t">
                <span className="text-muted-foreground">ID записи</span>
                <span className="font-mono text-xs">{lastBooking.id}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="w-full max-w-sm space-y-3">
          <Button
            className="w-full"
            size="lg"
            onClick={() => onNavigate?.('orders')}
          >
            Мои записи
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => onNavigate?.('home')}
          >
            На главную
          </Button>
        </div>
      </div>
    </div>
  );
}
