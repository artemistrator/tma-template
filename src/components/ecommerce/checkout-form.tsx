'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useCartStore, ShippingAddress } from '@/store/cart-store';
import { useTelegramContext } from '@/lib/telegram/telegram-provider';

interface CheckoutFormProps {
  id?: string;
  onSubmit?: (address: ShippingAddress) => void;
  className?: string;
}

/**
 * CheckoutForm - Shipping address form component
 * Collects customer information for order fulfillment
 */
export function CheckoutForm({
  id,
  onSubmit,
  className,
}: CheckoutFormProps) {
  const { hapticFeedback, showAlert } = useTelegramContext();
  const shippingAddress = useCartStore((state) => state.shippingAddress);
  const setShippingAddress = useCartStore((state) => state.setShippingAddress);

  const [formData, setFormData] = React.useState<ShippingAddress>({
    name: shippingAddress?.name || '',
    phone: shippingAddress?.phone || '',
    address: shippingAddress?.address || '',
    city: shippingAddress?.city || '',
    zipCode: shippingAddress?.zipCode || '',
    country: shippingAddress?.country || '',
  });

  const [errors, setErrors] = React.useState<Partial<Record<keyof ShippingAddress, string>>>({});

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
    hapticFeedback.impact('medium');

    // Validate all fields
    const newErrors: Partial<Record<keyof ShippingAddress, string>> = {};
    Object.entries(formData).forEach(([key, value]) => {
      const error = validateField(key as keyof ShippingAddress, value);
      if (error) {
        newErrors[key as keyof ShippingAddress] = error;
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      hapticFeedback.error();
      showAlert('Please fill in all required fields correctly');
      return;
    }

    // Save address and submit
    setShippingAddress(formData);
    onSubmit?.(formData);
  };

  const inputClasses = "w-full";

  return (
    <Card className={cn("", className)} id={id}>
      <CardHeader>
        <CardTitle>Shipping Information</CardTitle>
        <CardDescription>
          Enter your delivery details
        </CardDescription>
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
            {errors.phone && (
              <p className="text-sm text-destructive mt-1">{errors.phone}</p>
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

          <Button type="submit" className="w-full" size="lg">
            Continue to Payment
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
