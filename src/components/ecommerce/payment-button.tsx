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
  };
}

/**
 * PaymentButton - Telegram Payment integration button
 * Uses Telegram's native payment system when available
 */
export function PaymentButton({
  id,
  text = 'Pay',
  amount,
  currency = 'USD',
  onPaymentSuccess,
  onPaymentError,
  disabled = false,
  className,
  variant = 'telegram',
}: PaymentButtonProps) {
  const [isProcessing, setIsProcessing] = React.useState(false);
  const total = useCartStore((state) => state.total);
  const shippingAddress = useCartStore((state) => state.shippingAddress);
  const items = useCartStore((state) => state.items);
  const clearCart = useCartStore((state) => state.clearCart);
  const { isTelegram, showAlert, hapticFeedback } = useTelegramContext();

  const paymentAmount = amount || total;

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
    return new Promise<void>((resolve) => {
      /**
       * TODO: Integrate Telegram Payment API
       * 
       * Backend integration example:
       * 1. Create invoice on backend:
       *    const response = await fetch('/api/create-invoice', {
       *      method: 'POST',
       *      body: JSON.stringify({ items, total, shippingAddress })
       *    });
       *    const { invoiceUrl } = await response.json();
       * 
       * 2. Open Telegram invoice:
       *    window.Telegram?.WebApp?.openInvoice(invoiceUrl, (status) => {
       *      if (status === 'paid') {
       *        hapticFeedback.success();
       *        clearCart();
       *        onPaymentSuccess?.(paymentId);
       *      }
       *    });
       */
      
      // Mock payment flow for demo
      setTimeout(() => {
        const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        hapticFeedback.success();
        clearCart();
        onPaymentSuccess?.(paymentId);
        resolve();
      }, 1500);
    });
  };

  const handleWebPayment = async () => {
    /**
     * TODO: Integrate payment gateway (Stripe, PayPal, etc.)
     * 
     * Example integration:
     * 1. Create payment intent on backend
     * 2. Use Stripe.js or PayPal SDK to process payment
     * 3. Handle success/error callbacks
     * 
     * Stripe example:
     *    const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_KEY);
     *    const { error } = await stripe.confirmCardPayment(clientSecret, {
     *      payment_method: { card: elements.getElement(CardElement) }
     *    });
     */
    
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        hapticFeedback.success();
        clearCart();
        onPaymentSuccess?.(paymentId);
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
