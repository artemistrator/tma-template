'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useCartStore } from '@/store/cart-store';
import { useTelegramContext } from '@/lib/telegram/telegram-provider';
import { Loader2 } from 'lucide-react';

interface PaymentButtonProps {
  id?: string;
  text?: string;
  amount?: number;
  currency?: string;
  onPaymentSuccess?: (paymentId: string) => void;
  onPaymentError?: (error: Error) => void;
  disabled?: boolean;
  className?: string;
  variant?: 'default' | 'telegram' | 'outline';
  props?: {
    text?: string;
    variant?: 'default' | 'telegram' | 'outline';
   onPaymentSuccess?: string;
  };
  onNavigate?: (pageId: string) => void;
}

/**
 * PaymentButton - Telegram Payment integration button
 * Uses Telegram's native payment system when available
 */
export function PaymentButton({
  id,
  text: directText = 'Pay',
  amount,
  currency = 'USD',
  onPaymentSuccess,
  onPaymentError,
  disabled = false,
  className,
  variant = 'telegram',
  props,
  onNavigate,
}: PaymentButtonProps) {
  const [isProcessing, setIsProcessing] = React.useState(false);
  const total = useCartStore((state) => state.total);
  const shippingAddress = useCartStore((state) => state.shippingAddress);
  const items = useCartStore((state) => state.items);
  const clearCart = useCartStore((state) => state.clearCart);
  const addOrder= useCartStore((state) => state.addOrder);
  const { isTelegram, showAlert, hapticFeedback } = useTelegramContext();

  // Support both direct props and nested props from schema
  const text = props?.text ?? directText;
  const paymentAmount = amount ?? total;
  const successCallback = props?.onPaymentSuccess ?? onPaymentSuccess;

  const handlePayment = async () => {
    if (!shippingAddress) {
      hapticFeedback.error();
     showAlert('Please enter shipping address first');
     return;
    }

    if (items.length === 0) {
      hapticFeedback.error();
     showAlert('Your cart is empty');
     return;
    }

    setIsProcessing(true);
    hapticFeedback.impact('medium');

    try {
      if (isTelegram) {
        // Use Telegram's native payment
        await handleTelegramPayment();
      } else {
        // Fallback to web payment (implement your own logic)
        await handleWebPayment();
      }
    } catch (error) {
      hapticFeedback.error();
     onPaymentError?.(error as Error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTelegramPayment = async () => {
   return new Promise<void>(async (resolve, reject) => {
      // Check if Telegram WebApp is available
     type TelegramWebApp = {
       // eslint-disable-next-line @typescript-eslint/no-explicit-any
       sendInvoice: (invoiceData: any, callback: (success: boolean) => void) => void;
     };
     // eslint-disable-next-line @typescript-eslint/no-explicit-any
     const WebApp = (window as unknown as { Telegram?: { WebApp?: TelegramWebApp } }).Telegram?.WebApp;
      
      if (!WebApp) {
        // Fallback if not in Telegram
       console.warn('Telegram WebApp not available, using fallback');
        try {
          await handleWebPayment();
         resolve();
        } catch (error) {
         reject(error);
        }
       return;
      }

      // Use Telegram invoice
     const invoiceData = {
       title: 'Order Payment',
        description: `Order #${Date.now().toString().slice(-6)}`,
        payload: JSON.stringify({
          items: items.map(i => ({ id: i.id, name: i.name, quantity: i.quantity })),
        }),
        provider_token: '', // Empty for test mode
        currency: 'USD',
        prices: items.map(item => ({
         label: item.name,
          amount: Math.round(item.price * 100), // Convert to cents
        })),
      };

      // Send invoice
      WebApp.sendInvoice(invoiceData, async (success: boolean) => {
        if (success) {
         const orderId = `ORD-${Date.now().toString().slice(-6)}`;

          addOrder({
           id: orderId,
            items: [...items],
           total: paymentAmount,
           shippingAddress: shippingAddress!,
           status: 'confirmed',
            createdAt: new Date().toISOString(),
          });

          hapticFeedback.success();
          clearCart();

          // Send Telegram notification to admin
          try {
            await fetch('/api/notify-admin', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                order: {
                  id: orderId,
                  total: paymentAmount,
                  items: items,
                  status: 'confirmed',
                },
                customer: {
                  id: shippingAddress?.name, // Will be updated from Telegram user
                  firstName: shippingAddress?.name?.split(' ')[0],
                  lastName: shippingAddress?.name?.split(' ')[1],
                  username: '',
                  phone: shippingAddress?.phone,
                  address: shippingAddress?.address,
                  city: shippingAddress?.city,
                  zipCode: shippingAddress?.zipCode,
                  country: shippingAddress?.country,
                },
              }),
            });
           console.log('Telegram notification sent for order:', orderId);
          } catch (error) {
           console.error('Failed to send Telegram notification:', error);
          }

          if (typeof successCallback === 'string' && successCallback.startsWith('navigate:')) {
           const targetPage = successCallback.split(':')[1];
           onNavigate?.(targetPage);
          } else if (typeof successCallback === 'function') {
            successCallback(orderId);
          }

         resolve();
        } else {
          hapticFeedback.error();
         reject(new Error('Payment cancelled'));
        }
      });
    });
  };

  const handleWebPayment = async () => {
    /**
     * TODO: Integrate payment gateway (Stripe, PayPal, etc.)
     */

   return new Promise<void>((resolve) => {
      setTimeout(() => {
       const orderId = `ORD-${Date.now().toString().slice(-6)}`;

        // Create order in store
        addOrder({
         id: orderId,
          items: [...items],
         total: paymentAmount,
         shippingAddress: shippingAddress!,
         status: 'confirmed',
          createdAt: new Date().toISOString(),
        });

        hapticFeedback.success();
        clearCart();
        
        // Handle navigation string like "navigate:order-success"
        if (typeof successCallback === 'string' && successCallback.startsWith('navigate:')) {
         const targetPage = successCallback.split(':')[1];
         onNavigate?.(targetPage);
        } else if (typeof successCallback === 'function') {
          successCallback(orderId);
        }
        
       resolve();
      }, 1500);
    });
  };

  const formattedAmount = new Intl.NumberFormat('en-US', {
   style: 'currency',
    currency,
  }).format(paymentAmount);

  const buttonVariant = variant === 'outline' ? 'outline' : 'default';

 return (
    <Button
     id={id}
      className={cn("w-full h-12 text-base font-semibold", className)}
      variant={buttonVariant}
     onClick={handlePayment}
      disabled={disabled || isProcessing || items.length === 0}
    >
      {isProcessing ? (
        <div className="flex items-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Processing...</span>
        </div>
      ) : (
        <div className="flex items-center justify-between w-full">
          <span>{text}</span>
          <span>{formattedAmount}</span>
        </div>
      )}
    </Button>
  );
}

/**
 * PaymentStatus - Display payment result
 */
interface PaymentStatusProps {
  success: boolean;
  paymentId?: string;
  amount?: number;
  onContinue?: () => void;
  className?: string;
}

export function PaymentStatus({
  success,
  paymentId,
  amount,
  onContinue,
  className,
}: PaymentStatusProps) {
  const { hapticFeedback } = useTelegramContext();

  React.useEffect(() => {
    if (success) {
      hapticFeedback.success();
    } else {
      hapticFeedback.error();
    }
  }, [success, hapticFeedback]);

 return (
    <div className={cn("text-center py-8", className)}>
      <div
        className={cn(
          "w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center",
          success ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
        )}
      >
        {success ? (
          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        )}
      </div>
      
      <h2 className="text-2xl font-bold mb-2">
        {success ? 'Payment Successful!' : 'Payment Failed'}
      </h2>
      
      {paymentId && (
        <p className="text-muted-foreground mb-2">
          Order ID: {paymentId}
        </p>
      )}
      
      {amount && (
        <p className="text-lg font-semibold mb-4">
          Amount: ${amount.toFixed(2)}
        </p>
      )}
      
      {onContinue && (
        <Button onClick={onContinue} className="mt-4">
          {success ? 'Continue Shopping' : 'Try Again'}
        </Button>
      )}
    </div>
  );
}
