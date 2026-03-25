'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useCartStore } from '@/store/cart-store';
import { useTelegramContext } from '@/lib/telegram/telegram-provider';
import { useAppConfig } from '@/context/app-config-context';
import { Loader2 } from 'lucide-react';
import { PaymentMethodSelector } from '@/lib/payments/payment-method-selector';
import type { PaymentMethod } from '@/lib/payments/yookassa';

interface PaymentButtonProps {
  id?: string;
  text?: string;
  amount?: number;
  currency?: string;
  onPaymentSuccess?: (paymentId: string) => void;
  onPaymentError?: (error: Error) => void;
  disabled?: boolean;
  className?: string;
  variant?: 'default' | 'telegram' | 'outline' | 'stars';
  props?: {
    text?: string;
    variant?: 'default' | 'telegram' | 'outline' | 'stars';
    onPaymentSuccess?: string;
  };
  onNavigate?: (pageId: string) => void;
}

/**
 * PaymentButton - Creates order via API with payment method selection.
 *
 * Supports three payment methods:
 * - yookassa: create order → create payment → redirect to YooKassa
 * - stars: create Stars invoice via Telegram
 * - cash: create order → mark as cash_on_delivery → success
 *
 * Payment methods are configured in tenant.config.payments.methods.
 * If not configured, falls back to legacy behavior (stars or default order).
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
  const [selectedMethod, setSelectedMethod] = React.useState<PaymentMethod | null>(null);
  const total = useCartStore((state) => state.total);
  const shippingAddress = useCartStore((state) => state.shippingAddress);
  const items = useCartStore((state) => state.items);
  const promoCode = useCartStore((state) => state.promoCode);
  const discountAmount = useCartStore((state) => state.discountAmount);
  const delivery = useCartStore((state) => state.delivery);
  const clearCart = useCartStore((state) => state.clearCart);
  const addOrder = useCartStore((state) => state.addOrder);
  const { showAlert, hapticFeedback, showMainButtonProgress, hideMainButtonProgress } = useTelegramContext();
  const { config } = useAppConfig();

  const tenantId = config?.meta.tenantId || 'default';
  const tenantSlug = config?.meta.slug || tenantId;
  const locale = config?.meta.locale || 'en';

  const text = props?.text ?? directText;
  const paymentAmount = amount ?? total;
  const successCallback = props?.onPaymentSuccess ?? onPaymentSuccess;

  // Get available payment methods from tenant config
  const tenantConfig = config?.meta as Record<string, unknown> | undefined;
  const paymentsConfig = tenantConfig?.payments as { methods?: PaymentMethod[] } | undefined;
  const availableMethods: PaymentMethod[] = paymentsConfig?.methods || [];

  // Legacy mode: no payment config → use variant to determine behavior
  const isLegacyMode = availableMethods.length === 0;
  const isStarsLegacy = (props?.variant ?? variant) === 'stars';

  // Auto-select first method
  React.useEffect(() => {
    if (availableMethods.length > 0 && !selectedMethod) {
      setSelectedMethod(availableMethods[0]);
    }
  }, [availableMethods, selectedMethod]);

  const isContactValid = (addr: typeof shippingAddress): boolean => {
    if (!addr) return false;
    return addr.name.length >= 2 && addr.phone.length >= 10;
  };

  const isAddressValid = (addr: typeof shippingAddress): boolean => {
    if (!addr) return false;
    return (
      isContactValid(addr) &&
      addr.address.length >= 5 &&
      addr.city.length >= 2 &&
      addr.zipCode.length >= 4 &&
      addr.country.length >= 2
    );
  };

  const handlePayment = async () => {
    if (items.length > 0) {
      const isPickupOrder = delivery?.method === 'pickup';
      const valid = isPickupOrder ? isContactValid(shippingAddress) : isAddressValid(shippingAddress);
      if (!valid) {
        hapticFeedback.error();
        showAlert(locale === 'ru'
          ? (isPickupOrder ? 'Заполните имя и телефон' : 'Заполните все поля доставки')
          : (isPickupOrder ? 'Please fill in name and phone' : 'Please fill in all shipping fields correctly'));
        return;
      }
    }

    if (items.length === 0) {
      hapticFeedback.error();
      showAlert(locale === 'ru' ? 'Корзина пуста' : 'Your cart is empty');
      return;
    }

    setIsProcessing(true);
    hapticFeedback.impact('medium');
    showMainButtonProgress(true);

    try {
      // Determine which payment flow to use
      const method = isLegacyMode ? (isStarsLegacy ? 'stars' : null) : selectedMethod;

      if (method === 'stars') {
        await handleStarsPayment();
      } else if (method === 'yookassa') {
        await handleYooKassaPayment();
      } else if (method === 'cash') {
        await handleCashPayment();
      } else {
        // Legacy default: create order without payment
        await handleCreateOrder();
      }
    } catch (error) {
      hapticFeedback.error();
      const msg = error instanceof Error ? error.message : 'Payment failed';
      showAlert(msg);
      onPaymentError?.(error as Error);
    } finally {
      setIsProcessing(false);
      hideMainButtonProgress();
    }
  };

  const handleStarsPayment = async () => {
    const webApp = typeof window !== 'undefined' ? window.Telegram?.WebApp : null;
    const tgUser = webApp?.initDataUnsafe?.user;
    if (!tgUser?.id) {
      showAlert('Could not identify your Telegram account. Please open this in Telegram.');
      return;
    }

    const response = await fetch('/api/orders/stars-invoice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenantId: tenantSlug,
        userId: tgUser.id,
        chatId: tgUser.id,
        customerName: shippingAddress?.name || tgUser.first_name || 'Customer',
        customerPhone: shippingAddress?.phone || '',
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
        } : undefined,
      }),
    });

    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.error || 'Failed to create Stars invoice');
    }

    // Open Telegram invoice
    if (webApp?.openInvoice) {
      webApp.openInvoice(result.invoiceUrl, (status: string) => {
        if (status === 'paid') {
          addOrder({
            id: result.orderId,
            items: [...items],
            total: paymentAmount,
            shippingAddress: shippingAddress || { name: '', phone: '', address: '', city: '', zipCode: '', country: '' },
            status: 'pending',
            createdAt: new Date().toISOString(),
          });
          hapticFeedback.success();
          clearCart();
          navigateToSuccess();
        } else if (status === 'cancelled' || status === 'failed') {
          hapticFeedback.error();
        }
      });
    } else {
      // Fallback: open in browser
      window.open(result.invoiceUrl, '_blank');
    }
  };

  const handleYooKassaPayment = async () => {
    // Step 1: Create order
    const orderId = await createOrder();
    if (!orderId) return;

    // Step 2: Create YooKassa payment
    const appUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const returnUrl = `${appUrl}/?page=order-success&orderId=${orderId}`;

    const payRes = await fetch('/api/payments/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId,
        tenantSlug,
        method: 'yookassa',
        returnUrl,
      }),
    });

    const payResult = await payRes.json();
    if (!payRes.ok || !payResult.success) {
      throw new Error(payResult.error || 'Failed to create payment');
    }

    // Step 3: Save order locally (pending payment)
    addOrder({
      id: orderId,
      items: [...items],
      total: paymentAmount,
      shippingAddress: shippingAddress || { name: '', phone: '', address: '', city: '', zipCode: '', country: '' },
      status: 'pending',
      createdAt: new Date().toISOString(),
    });

    // Step 4: Redirect to payment page
    if (payResult.confirmationUrl) {
      clearCart();
      const webApp = typeof window !== 'undefined' ? window.Telegram?.WebApp : null;
      if (webApp?.openLink) {
        // Use Telegram's openLink for better UX in WebApp
        webApp.openLink(payResult.confirmationUrl);
      } else {
        window.location.href = payResult.confirmationUrl;
      }
    } else if (payResult.testMode) {
      // Test mode: simulate success
      hapticFeedback.success();
      clearCart();
      navigateToSuccess();
    }
  };

  const handleCashPayment = async () => {
    // Create order with cash payment method
    const orderId = await createOrder('cash');
    if (!orderId) return;

    addOrder({
      id: orderId,
      items: [...items],
      total: paymentAmount,
      shippingAddress: shippingAddress || { name: '', phone: '', address: '', city: '', zipCode: '', country: '' },
      status: 'pending',
      createdAt: new Date().toISOString(),
    });

    hapticFeedback.success();
    clearCart();
    navigateToSuccess();
  };

  /** Create order in Directus, return orderId */
  const createOrder = async (paymentMethod?: string): Promise<string | null> => {
    const orderData: Record<string, unknown> = {
      tenantId: tenantSlug,
      customerName: shippingAddress?.name || 'Customer',
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
      promoCode: promoCode || undefined,
      discountAmount: discountAmount > 0 ? discountAmount : undefined,
      paymentMethod,
    };

    // Include delivery info if set
    if (delivery) {
      orderData.deliveryMethod = delivery.method;
      orderData.deliveryPrice = delivery.price;
      orderData.deliveryInfo = delivery;
    }

    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData),
    });

    const result = await response.json();
    if (response.status === 409 && result.outOfStock) {
      // Stock error — show user-friendly message
      const names = (result.outOfStock as Array<{ name: string; available: number }>)
        .map(i => `${i.name} (${locale === 'ru' ? 'доступно' : 'available'}: ${i.available})`)
        .join(', ');
      throw new Error(locale === 'ru' ? `Недостаточно товара: ${names}` : `Not enough stock: ${names}`);
    }
    if (!response.ok || !result.success) {
      throw new Error(result.error || 'Failed to create order');
    }

    return result.orderId;
  };

  /** Legacy: create order without payment routing */
  const handleCreateOrder = async () => {
    const orderId = await createOrder();
    if (!orderId) return;

    addOrder({
      id: orderId,
      items: [...items],
      total: paymentAmount,
      shippingAddress: shippingAddress || { name: '', phone: '', address: '', city: '', zipCode: '', country: '' },
      status: 'pending',
      createdAt: new Date().toISOString(),
    });

    hapticFeedback.success();
    clearCart();

    if (typeof successCallback === 'function') {
      successCallback(orderId);
    } else {
      navigateToSuccess();
    }
  };

  const navigateToSuccess = () => {
    if (typeof successCallback === 'string' && successCallback.startsWith('navigate:')) {
      const targetPage = successCallback.split(':')[1];
      onNavigate?.(targetPage);
    }
  };

  const formattedAmount = new Intl.NumberFormat(locale === 'ru' ? 'ru-RU' : 'en-US', {
    style: 'currency',
    currency,
  }).format(paymentAmount);

  // Determine button label based on selected method
  const getButtonLabel = () => {
    if (isLegacyMode && isStarsLegacy) {
      return { prefix: '\u2B50 ', amount: `${Math.round(paymentAmount)} Stars` };
    }
    if (selectedMethod === 'stars') {
      return { prefix: '\u2B50 ', amount: `${Math.round(paymentAmount)} Stars` };
    }
    if (selectedMethod === 'cash') {
      return { prefix: '', amount: locale === 'ru' ? 'Наличные' : 'Cash' };
    }
    return { prefix: '', amount: formattedAmount };
  };

  const label = getButtonLabel();
  const effectiveVariant = props?.variant ?? variant;
  const buttonVariant = effectiveVariant === 'outline' ? 'outline' : 'default';
  const isStarsButton = (isLegacyMode && isStarsLegacy) || selectedMethod === 'stars';
  const starsButtonClass = isStarsButton
    ? 'bg-warning text-warning-foreground border-warning hover:bg-warning/90'
    : '';

  return (
    <div id={id} className={cn('space-y-4', className)}>
      {/* Payment method selector (only when configured) */}
      {!isLegacyMode && availableMethods.length > 1 && (
        <PaymentMethodSelector
          methods={availableMethods}
          selected={selectedMethod}
          onSelect={setSelectedMethod}
          locale={locale}
        />
      )}

      <Button
        className={cn("w-full h-12 text-base font-semibold", starsButtonClass)}
        variant={buttonVariant}
        onClick={handlePayment}
        disabled={disabled || isProcessing || items.length === 0}
      >
        {isProcessing ? (
          <div className="flex items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>{locale === 'ru' ? 'Обработка...' : 'Processing...'}</span>
          </div>
        ) : (
          <div className="flex items-center justify-between w-full">
            <span>{label.prefix}{text}</span>
            <span>{label.amount}</span>
          </div>
        )}
      </Button>
    </div>
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
          success ? "bg-success-bg text-success-foreground" : "bg-error-bg text-error-foreground"
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
