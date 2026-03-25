'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useTelegramContext } from '@/lib/telegram/telegram-provider';
import { useAppConfig } from '@/context/app-config-context';
import { useCartStore } from '@/store/cart-store';
import { useTranslation } from '@/lib/use-translation';
import { PaymentMethodSelector } from '@/lib/payments/payment-method-selector';
import type { PaymentMethod } from '@/lib/payments/yookassa';
import Image from 'next/image';

interface InfoProductRef {
  id: string;
  name: string;
  type: string;
  price: number;
  image?: string | null;
  description?: string | null;
  externalUrl?: string | null;
  fileId?: string | null;
}

interface InfobizCheckoutProps {
  id?: string;
  className?: string;
  props?: {
    onSuccess?: string;
  };
  onNavigate?: (pageId: string) => void;
}

/**
 * InfobizCheckout — checkout for digital products.
 * Reads selected product from sessionStorage (set by InfoProductDetails).
 * Collects name + email.
 * For paid products: calls /api/create-stars-invoice → opens Telegram Stars payment.
 * For free products: creates order directly.
 */
export function InfobizCheckout({
  id,
  className,
  props,
  onNavigate,
}: InfobizCheckoutProps) {
  const onSuccessAction = props?.onSuccess ?? 'navigate:order-success';
  const { hapticFeedback, initData } = useTelegramContext();
  const tgUser = (initData as Record<string, unknown> | null)?.user as { id?: number; first_name?: string; last_name?: string } | undefined;
  const { config } = useAppConfig();
  const { t } = useTranslation();
  const addOrder = useCartStore((s) => s.addOrder);

  const [product, setProduct] = React.useState<InfoProductRef | null>(null);
  const [formData, setFormData] = React.useState({
    name: tgUser?.first_name ? `${tgUser.first_name}${tgUser.last_name ? ' ' + tgUser.last_name : ''}` : '',
    email: '',
  });
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [selectedMethod, setSelectedMethod] = React.useState<PaymentMethod | null>(null);

  // Get available payment methods from tenant config
  const tenantConfigRaw = config?.meta as Record<string, unknown> | undefined;
  const paymentsConfig = tenantConfigRaw?.payments as { methods?: PaymentMethod[] } | undefined;
  const availableMethods: PaymentMethod[] = paymentsConfig?.methods || [];
  const locale = config?.meta?.locale || 'en';

  // Auto-select first method
  React.useEffect(() => {
    if (availableMethods.length > 0 && !selectedMethod) {
      setSelectedMethod(availableMethods[0]);
    }
  }, [availableMethods, selectedMethod]);

  // Load product from sessionStorage
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = sessionStorage.getItem('infobiz_checkout_product');
    if (stored) {
      try {
        setProduct(JSON.parse(stored));
      } catch {
        // ignore
      }
    }
  }, []);

  const isFree = (product?.price ?? 0) === 0;
  const tenantId = config?.meta?.slug || 'default';

  const handleBack = () => {
    hapticFeedback.impact('light');
    onNavigate?.('product-details');
  };

  const isValid = formData.name.trim().length >= 2 && formData.email.trim().includes('@');

  const handleCheckout = async () => {
    if (!isValid) {
      setError(t('checkout.fillDetails'));
      return;
    }
    if (!product) {
      setError(t('checkout.noProduct'));
      return;
    }

    hapticFeedback.impact('medium');
    setLoading(true);
    setError('');

    try {
      if (isFree) {
        // Free product — create order directly
        const res = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tenantId,
            customerName: formData.name.trim(),
            phone: '',
            email: formData.email.trim(),
            items: [{ id: product.id, name: product.name, price: 0, quantity: 1 }],
            total: 0,
            orderType: 'infobiz',
            productId: product.id,
          }),
        });
        const data = await res.json();
        if (data.success) {
          hapticFeedback.success();
          addOrder({
            id: String(data.id || Date.now()),
            items: [{ id: product.id, name: product.name, price: 0, quantity: 1 }],
            total: 0,
            shippingAddress: { name: formData.name, phone: '', address: '', city: '', zipCode: '', country: '' },
            status: 'pending',
            createdAt: new Date().toISOString(),
          });
          sessionStorage.removeItem('infobiz_checkout_product');
          sessionStorage.removeItem('infobiz_selected_product');
          if (onSuccessAction.startsWith('navigate:')) {
            onNavigate?.(onSuccessAction.split(':')[1]);
          }
        } else {
          setError(data.message || 'Failed to create order');
          hapticFeedback.error();
        }
      } else {
        // Determine payment method: use selected or fallback to stars
        const method = availableMethods.length > 0 ? selectedMethod : 'stars';

        if (method === 'yookassa') {
          // YooKassa: create order → create payment → redirect
          const orderRes = await fetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tenantId,
              customerName: formData.name.trim(),
              phone: '',
              email: formData.email.trim(),
              items: [{ id: product.id, name: product.name, price: product.price, quantity: 1 }],
              total: product.price,
              orderType: 'infobiz',
              productId: product.id,
            }),
          });
          const orderData = await orderRes.json();
          if (!orderData.success) {
            throw new Error(orderData.error || 'Failed to create order');
          }

          const appUrl = typeof window !== 'undefined' ? window.location.origin : '';
          const returnUrl = `${appUrl}/?page=order-success&orderId=${orderData.orderId}`;

          const payRes = await fetch('/api/payments/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orderId: orderData.orderId,
              tenantSlug: tenantId,
              method: 'yookassa',
              returnUrl,
            }),
          });
          const payData = await payRes.json();
          if (payData.success && payData.confirmationUrl) {
            sessionStorage.removeItem('infobiz_checkout_product');
            sessionStorage.removeItem('infobiz_selected_product');
            const webApp = typeof window !== 'undefined' ? window.Telegram?.WebApp : null;
            if (webApp?.openLink) {
              webApp.openLink(payData.confirmationUrl);
            } else {
              window.location.href = payData.confirmationUrl;
            }
          } else if (payData.testMode) {
            hapticFeedback.success();
            sessionStorage.removeItem('infobiz_checkout_product');
            sessionStorage.removeItem('infobiz_selected_product');
            if (onSuccessAction.startsWith('navigate:')) {
              onNavigate?.(onSuccessAction.split(':')[1]);
            }
          } else {
            throw new Error(payData.error || 'Payment creation failed');
          }
        } else if (method === 'cash') {
          // Cash: create order, show success
          const res = await fetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tenantId,
              customerName: formData.name.trim(),
              phone: '',
              email: formData.email.trim(),
              items: [{ id: product.id, name: product.name, price: product.price, quantity: 1 }],
              total: product.price,
              orderType: 'infobiz',
              productId: product.id,
              paymentMethod: 'cash',
            }),
          });
          const data = await res.json();
          if (data.success) {
            hapticFeedback.success();
            sessionStorage.removeItem('infobiz_checkout_product');
            sessionStorage.removeItem('infobiz_selected_product');
            if (onSuccessAction.startsWith('navigate:')) {
              onNavigate?.(onSuccessAction.split(':')[1]);
            }
          } else {
            throw new Error(data.error || 'Failed to create order');
          }
        } else {
          // Stars (default): create Telegram Stars invoice
          const chatId = tgUser?.id;
          if (!chatId) {
            setError(t('checkout.noTelegramAccount'));
            setLoading(false);
            return;
          }

          const res = await fetch('/api/create-stars-invoice', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              productId: product.id,
              tenantId,
              userId: chatId,
              chatId,
              customerName: formData.name.trim(),
              customerEmail: formData.email.trim(),
            }),
          });
          const data = await res.json();
          if (data.success && data.invoiceUrl) {
            const tgWebApp = (typeof window !== 'undefined' ? (window as unknown as Record<string, unknown>).Telegram : null) as Record<string, unknown> | null;
            const openInvoice = (tgWebApp?.WebApp as Record<string, unknown> | undefined)?.openInvoice as ((url: string, cb: (status: string) => void) => void) | undefined;
            if (openInvoice) {
              openInvoice(data.invoiceUrl, (status: string) => {
                if (status === 'paid') {
                  hapticFeedback.success();
                  sessionStorage.removeItem('infobiz_checkout_product');
                  sessionStorage.removeItem('infobiz_selected_product');
                  if (onSuccessAction.startsWith('navigate:')) {
                    onNavigate?.(onSuccessAction.split(':')[1]);
                  }
                } else if (status === 'cancelled' || status === 'failed') {
                  hapticFeedback.error();
                  setError(t('checkout.paymentCancelled'));
                }
              });
            } else {
              window.open(data.invoiceUrl, '_blank');
            }
          } else {
            setError(data.error || 'Failed to create invoice');
            hapticFeedback.error();
          }
        }
      }
    } catch {
      setError(t('checkout.networkError'));
      hapticFeedback.error();
    } finally {
      setLoading(false);
    }
  };

  if (!product) {
    return (
      <div className="text-center py-16 text-muted-foreground p-4">
        <p>{t('product.noProductSelected')}</p>
        <Button variant="ghost" className="mt-4" onClick={() => onNavigate?.('catalog')}>
          {t('product.goToCatalog')}
        </Button>
      </div>
    );
  }

  const formattedPrice = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: config?.meta?.currency || 'USD',
  }).format(product.price);

  return (
    <div id={id} className={cn('p-4 space-y-4', className)}>
      {/* Product summary */}
      <Card>
        <CardContent className="p-4 flex gap-3 items-center">
          {product.image && (
            <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
              <Image src={product.image} alt={product.name} fill unoptimized className="object-cover" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground capitalize mb-0.5">{product.type}</p>
            <p className="font-semibold truncate">{product.name}</p>
          </div>
          <div className="text-right flex-shrink-0">
            {isFree ? (
              <span className="text-emerald-600 font-bold">{t('product.free')}</span>
            ) : (
              <span className="font-bold text-lg">{formattedPrice}</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Contact details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('checkout.yourDetails')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <label className="text-sm font-medium">{t('checkout.name')} *</label>
            <Input
              placeholder={t('checkout.namePlaceholder')}
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">{t('checkout.email')} * <span className="text-muted-foreground text-xs">{t('checkout.emailNote')}</span></label>
            <Input
              type="email"
              placeholder={t('checkout.emailPlaceholder')}
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Payment method selector (for paid products when configured) */}
      {!isFree && availableMethods.length > 1 && (
        <Card>
          <CardContent className="p-4">
            <PaymentMethodSelector
              methods={availableMethods}
              selected={selectedMethod}
              onSelect={setSelectedMethod}
              locale={locale}
            />
          </CardContent>
        </Card>
      )}

      {error && <p className="text-sm text-destructive px-1">{error}</p>}

      <Button
        className="w-full"
        size="lg"
        onClick={handleCheckout}
        disabled={loading || !isValid}
      >
        {loading
          ? t('checkout.processing')
          : isFree
          ? t('checkout.getFree')
          : selectedMethod === 'cash'
          ? (locale === 'ru' ? 'Оформить заказ' : 'Place Order')
          : selectedMethod === 'yookassa'
          ? (locale === 'ru' ? `Оплатить ${formattedPrice}` : `Pay ${formattedPrice}`)
          : t('checkout.payWithStars', { price: formattedPrice })}
      </Button>

      <button
        onClick={handleBack}
        className="w-full text-sm text-muted-foreground py-2"
      >
        {t('checkout.back')}
      </button>
    </div>
  );
}
