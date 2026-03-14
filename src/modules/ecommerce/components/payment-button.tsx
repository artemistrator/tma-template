'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useCartStore } from '@/store/cart-store';
import { useTelegramContext } from '@/lib/telegram/telegram-provider';
import { useAppConfig } from '@/context/app-config-context';
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
 * PaymentButton - Creates order via API
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
  const addOrder = useCartStore((state) => state.addOrder);
  const { showAlert, hapticFeedback, showMainButtonProgress, hideMainButtonProgress } = useTelegramContext();
  const { config } = useAppConfig();
  
  const tenantId = config?.meta.tenantId || 'default';

  const text = props?.text ?? directText;
  const paymentAmount = amount ?? total;
  const successCallback = props?.onPaymentSuccess ?? onPaymentSuccess;

  const handlePayment = async () => {
    if (!shippingAddress && items.length > 0) {
      hapticFeedback.error();
      showAlert('Please fill in the form first');
      return;
    }

    if (items.length === 0) {
      hapticFeedback.error();
      showAlert('Your cart is empty');
      return;
    }

    setIsProcessing(true);
    hapticFeedback.impact('medium');

    // Show native Telegram MainButton progress loader
    showMainButtonProgress(true);

    try {
      await handleCreateOrder();
    } catch (error) {
      hapticFeedback.error();
      onPaymentError?.(error as Error);
    } finally {
      setIsProcessing(false);
      // Hide native Telegram MainButton progress loader
      hideMainButtonProgress();
    }
  };

  const handleCreateOrder = async () => {
    const orderData = {
      tenantId,
      customerName: shippingAddress?.name || 'Booking Customer',
      phone: shippingAddress?.phone || '',
      items: items.map(item => ({
        id: item.id,
        name: item.name,
        price: Number(item.price),
        quantity: Number(item.quantity),
      })),
      total: Number(paymentAmount),
      address: shippingAddress ? {
        address: shippingAddress.address,
        city: shippingAddress.city,
        zipCode: shippingAddress.zipCode,
        country: shippingAddress.country,
      } : {},
    };

    console.log('[PaymentButton] Creating order:', orderData);
    console.log('[PaymentButton] Items:', items);
    console.log('[PaymentButton] Total:', paymentAmount, 'Type:', typeof paymentAmount);

    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderData),
    });

    const result = await response.json();
    console.log('[PaymentButton] API Response:', result);

    if (!response.ok || !result.success) {
      throw new Error(result.error || 'Failed to create order');
    }

    console.log('[PaymentButton] Order created:', result.orderId);

    // Save order locally
    addOrder({
      id: result.orderId,
      items: [...items],
      total: paymentAmount,
      shippingAddress: shippingAddress,
      status: 'confirmed',
      createdAt: new Date().toISOString(),
    });

    hapticFeedback.success();
    clearCart();

    // Navigate to success page
    if (typeof successCallback === 'string' && successCallback.startsWith('navigate:')) {
      const targetPage = successCallback.split(':')[1];
      onNavigate?.(targetPage);
    } else if (typeof successCallback === 'function') {
      successCallback(result.orderId);
    }
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
