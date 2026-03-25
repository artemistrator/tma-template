'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useCartStore, ShippingAddress } from '@/store/cart-store';
import { useTelegramContext } from '@/lib/telegram/telegram-provider';
import { useTelegramUser } from '@/lib/telegram/use-telegram-user';
import { useAppConfig } from '@/context/app-config-context';
import { DeliveryMethodSelector } from '@/lib/delivery/delivery-method-selector';
import type { DeliveryOption, DeliveryMethodType } from '@/lib/delivery/types';

interface CheckoutFormProps {
  id?: string;
  className?: string;
}

/**
 * CheckoutForm - Shipping address form component
 * Collects customer information for order fulfillment
 */
export function CheckoutForm({
  id,
  className,
}: CheckoutFormProps) {
  const { hapticFeedback, showAlert } = useTelegramContext();
  const { config } = useAppConfig();
  const shippingAddress = useCartStore((state) => state.shippingAddress);
  const setShippingAddress = useCartStore((state) => state.setShippingAddress);
  const setDelivery = useCartStore((state) => state.setDelivery);
  const total = useCartStore((state) => state.total);
  const telegramUser = useCartStore((state) => state.telegramUser);
  const { requestPhoneContact, hasPhone } = useTelegramUser();

  const locale = config?.meta?.locale || 'en';
  const currency = config?.meta?.currency || 'USD';
  const tenantSlug = config?.meta?.slug || '';

  // Delivery state
  const tenantConfigRaw = config?.meta as Record<string, unknown> | undefined;
  const deliveryConfig = tenantConfigRaw?.delivery as { methods?: DeliveryMethodType[] } | undefined;
  const hasDeliveryConfig = deliveryConfig?.methods && deliveryConfig.methods.length > 0;

  const [deliveryOptions, setDeliveryOptions] = React.useState<DeliveryOption[]>([]);
  const [selectedDeliveryId, setSelectedDeliveryId] = React.useState<string | null>(null);
  const [deliveryLoading, setDeliveryLoading] = React.useState(false);

  // Fetch delivery options when component mounts
  React.useEffect(() => {
    if (!hasDeliveryConfig || !tenantSlug) return;
    setDeliveryLoading(true);
    fetch('/api/delivery/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantSlug, cartTotal: total }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.success && data.options) {
          setDeliveryOptions(data.options);
          // Auto-select first option
          if (data.options.length > 0 && !selectedDeliveryId) {
            handleDeliverySelect(data.options[0]);
          }
        }
      })
      .catch(() => {})
      .finally(() => setDeliveryLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasDeliveryConfig, tenantSlug]);

  const handleDeliverySelect = (option: DeliveryOption) => {
    setSelectedDeliveryId(option.id);
    hapticFeedback.impact('light');
    setDelivery({
      method: option.type,
      optionId: option.id,
      price: option.price,
      name: option.name,
      pickupPointId: option.pickupPoint?.id,
      pickupPointName: option.pickupPoint?.name,
      pickupPointAddress: option.pickupPoint?.address,
      estimatedDays: option.estimatedDays,
    });
  };

  const isPickup = deliveryOptions.find(o => o.id === selectedDeliveryId)?.type === 'pickup';

  const [formData, setFormData] = React.useState<ShippingAddress>({
    name: shippingAddress?.name || (telegramUser?.firstName ? `${telegramUser.firstName || ''} ${telegramUser.lastName || ''}`.trim() : ''),
    phone: shippingAddress?.phone || telegramUser?.phone || '',
    address: shippingAddress?.address || '',
    city: shippingAddress?.city || '',
    zipCode: shippingAddress?.zipCode || '',
    country: shippingAddress?.country || '',
  });

  const [errors, setErrors] = React.useState<Partial<Record<keyof ShippingAddress, string>>>({});
  const [isRequestingPhone, setIsRequestingPhone] = React.useState(false);
  const [isLocating, setIsLocating] = React.useState(false);

  // Auto-save address to store whenever form data changes
  React.useEffect(() => {
    setShippingAddress(formData);
  }, [formData, setShippingAddress]);

  const validateField = (name: keyof ShippingAddress, value: string): string | null => {
    switch (name) {
      case 'name':
        return value.length < 2 ? 'Name must be at least 2 characters' : null;
      case 'phone':
        return value.length < 10 ? 'Please enter a valid phone number' : null;
      case 'address':
        return value.length < 5 ? 'Please enter a valid address' : null;
      case 'city':
        return value.length < 2 ? 'Please enter a valid city' : null;
      case 'zipCode':
        return value.length < 4 ? 'Please enter a valid ZIP code' : null;
      case 'country':
        return value.length < 2 ? 'Please enter a valid country' : null;
      default:
        return null;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name as keyof ShippingAddress]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const error = validateField(name as keyof ShippingAddress, value);
    
    if (error) {
      setErrors((prev) => ({ ...prev, [name]: error }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
  };

  const handleUseLocation = () => {
    if (!navigator.geolocation) return;
    setIsLocating(true);
    hapticFeedback.impact('light');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
            { headers: { 'Accept-Language': 'en' } }
          );
          const data = await res.json();
          const addr = data.address || {};
          setFormData((prev) => ({
            ...prev,
            address: [addr.road, addr.house_number].filter(Boolean).join(' ') || prev.address,
            city: addr.city || addr.town || addr.village || addr.county || prev.city,
            zipCode: addr.postcode || prev.zipCode,
            country: addr.country || prev.country,
          }));
          hapticFeedback.success();
        } catch {
          hapticFeedback.error();
        } finally {
          setIsLocating(false);
        }
      },
      () => {
        hapticFeedback.error();
        setIsLocating(false);
      },
      { timeout: 10000 }
    );
  };

  const inputClasses = "w-full";

  return (
    <>
    {/* Delivery method selection (if configured) */}
    {hasDeliveryConfig && (
      <Card className={cn("mb-4", className)}>
        <CardContent className="pt-5">
          <DeliveryMethodSelector
            options={deliveryOptions}
            selected={selectedDeliveryId}
            onSelect={handleDeliverySelect}
            loading={deliveryLoading}
            locale={locale}
            currency={currency}
          />
        </CardContent>
      </Card>
    )}

    {/* Hide address form when pickup is selected */}
    {!isPickup && (
    <Card className={cn("", className)} id={id}>
      <CardHeader>
        <CardTitle>{locale === 'ru' ? 'Информация о доставке' : 'Shipping Information'}</CardTitle>
        <CardDescription>
          {locale === 'ru' ? 'Введите данные для доставки' : 'Enter your delivery details'}
        </CardDescription>
        {typeof navigator !== 'undefined' && 'geolocation' in navigator && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2 w-full gap-2 text-muted-foreground"
            onClick={handleUseLocation}
            disabled={isLocating}
          >
            {isLocating ? (
              <>
                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Detecting location...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Use my location
              </>
            )}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-1">
              Full Name *
            </label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              onBlur={handleBlur}
              className={cn(inputClasses, errors.name && "border-destructive")}
              placeholder="John Doe"
            />
            {errors.name && (
              <p className="text-sm text-destructive mt-1">{errors.name}</p>
            )}
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium mb-1">
              Phone Number *
            </label>
            <div className="flex gap-2">
              <Input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                onBlur={handleBlur}
                className={cn(inputClasses, errors.phone && "border-destructive")}
                placeholder="+1 234 567 8900"
              />
              {!hasPhone && (
                <Button
                  type="button"
                  variant="outline"
                onClick={async () => {
                   setIsRequestingPhone(true);
                   hapticFeedback.impact('light');
                   try {
                     const result = await requestPhoneContact();
                     if (result) {
                       hapticFeedback.success();
                     } else {
                       hapticFeedback.error();
                     }
                   } catch {
                     hapticFeedback.error();
                     showAlert('Failed to get phone from Telegram');
                   } finally {
                     setIsRequestingPhone(false);
                   }
                 }}
                 disabled={isRequestingPhone}
               >
                 {isRequestingPhone ? '...' : 'Get from TG'}
               </Button>
             )}

            </div>
            {errors.phone && (
              <p className="text-sm text-destructive mt-1">{errors.phone}</p>
            )}
            {hasPhone && (
              <p className="text-xs text-success-foreground mt-1">✓ Phone verified via Telegram</p>
            )}
          </div>

          <div>
            <label htmlFor="address" className="block text-sm font-medium mb-1">
              Street Address *
            </label>
            <Input
              id="address"
              name="address"
              value={formData.address}
              onChange={handleChange}
              onBlur={handleBlur}
              className={cn(inputClasses, errors.address && "border-destructive")}
              placeholder="123 Main St, Apt 4B"
            />
            {errors.address && (
              <p className="text-sm text-destructive mt-1">{errors.address}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="city" className="block text-sm font-medium mb-1">
                City *
              </label>
              <Input
                id="city"
                name="city"
                value={formData.city}
                onChange={handleChange}
                onBlur={handleBlur}
                className={cn(inputClasses, errors.city && "border-destructive")}
                placeholder="New York"
              />
              {errors.city && (
                <p className="text-sm text-destructive mt-1">{errors.city}</p>
              )}
            </div>

            <div>
              <label htmlFor="zipCode" className="block text-sm font-medium mb-1">
                ZIP Code *
              </label>
              <Input
                id="zipCode"
                name="zipCode"
                value={formData.zipCode}
                onChange={handleChange}
                onBlur={handleBlur}
                className={cn(inputClasses, errors.zipCode && "border-destructive")}
                placeholder="10001"
              />
              {errors.zipCode && (
                <p className="text-sm text-destructive mt-1">{errors.zipCode}</p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="country" className="block text-sm font-medium mb-1">
              Country *
            </label>
            <Input
              id="country"
              name="country"
              value={formData.country}
              onChange={handleChange}
              onBlur={handleBlur}
              className={cn(inputClasses, errors.country && "border-destructive")}
              placeholder="United States"
            />
            {errors.country && (
              <p className="text-sm text-destructive mt-1">{errors.country}</p>
            )}
          </div>

        </form>
      </CardContent>
    </Card>
    )}

    {/* For pickup: show minimal contact form (name + phone only) */}
    {isPickup && (
      <Card className={className}>
        <CardHeader>
          <CardTitle>{locale === 'ru' ? 'Контактная информация' : 'Contact Information'}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                {locale === 'ru' ? 'Имя' : 'Full Name'} *
              </label>
              <Input
                name="name"
                value={formData.name}
                onChange={handleChange}
                onBlur={handleBlur}
                className={cn("w-full", errors.name && "border-destructive")}
                placeholder={locale === 'ru' ? 'Иван Иванов' : 'John Doe'}
              />
              {errors.name && <p className="text-sm text-destructive mt-1">{errors.name}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                {locale === 'ru' ? 'Телефон' : 'Phone Number'} *
              </label>
              <div className="flex gap-2">
                <Input
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={cn("w-full", errors.phone && "border-destructive")}
                  placeholder="+7 999 123 4567"
                />
                {!hasPhone && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={async () => {
                      setIsRequestingPhone(true);
                      hapticFeedback.impact('light');
                      try {
                        const result = await requestPhoneContact();
                        if (result) hapticFeedback.success();
                        else hapticFeedback.error();
                      } catch {
                        hapticFeedback.error();
                        showAlert('Failed to get phone from Telegram');
                      } finally {
                        setIsRequestingPhone(false);
                      }
                    }}
                    disabled={isRequestingPhone}
                  >
                    {isRequestingPhone ? '...' : 'Get from TG'}
                  </Button>
                )}
              </div>
              {errors.phone && <p className="text-sm text-destructive mt-1">{errors.phone}</p>}
            </div>
          </div>
        </CardContent>
      </Card>
    )}
    </>
  );
}
