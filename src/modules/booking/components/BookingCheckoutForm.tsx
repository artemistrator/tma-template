'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useCartStore } from '@/store/cart-store';
import { useTelegramContext } from '@/lib/telegram/telegram-provider';
import { useAppConfig } from '@/context/app-config-context';

interface BookingCheckoutFormProps {
  id?: string;
  onSubmit?: (booking: any) => void;
  className?: string;
}

export function BookingCheckoutForm({ id, onSubmit, className }: BookingCheckoutFormProps) {
  const { hapticFeedback, showAlert } = useTelegramContext();
  const { config } = useAppConfig();
  const shippingAddress = useCartStore((state) => state.shippingAddress);
  const setShippingAddress = useCartStore((state) => state.setShippingAddress);
  const items = useCartStore((state) => state.items);
  const total = useCartStore((state) => state.total);

  const [formData, setFormData] = React.useState({
    customerName: shippingAddress?.name || '',
    customerPhone: shippingAddress?.phone || '',
    customerEmail: shippingAddress?.address || '',
    date: '',
    notes: '',
  });

  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validateField = (name: string, value: string): string | null => {
    switch (name) {
      case 'customerName':
        return value.length < 2 ? 'Name must be at least 2 characters' : null;
      case 'customerPhone':
        return value.length < 10 ? 'Please enter a valid phone number' : null;
      case 'date':
        return !value ? 'Please select a date and time' : null;
      default:
        return null;
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const error = validateField(name, value);
    if (error) {
      setErrors((prev) => ({ ...prev, [name]: error }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    hapticFeedback.impact('medium');

    const newErrors: Record<string, string> = {};
    Object.entries(formData).forEach(([key, value]) => {
      const error = validateField(key, value);
      if (error) {
        newErrors[key] = error;
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      hapticFeedback.error();
      showAlert('Please fill in all required fields correctly');
      return;
    }

    // Save address and submit
    setShippingAddress({
      name: formData.customerName,
      phone: formData.customerPhone,
      address: formData.customerEmail,
      city: '',
      zipCode: '',
      country: '',
    });

    onSubmit?.({
      customerName: formData.customerName,
      customerPhone: formData.customerPhone,
      customerEmail: formData.customerEmail,
      date: formData.date,
      notes: formData.notes,
      items,
      total,
      tenantId: config?.meta.tenantId,
    });
  };

  const inputClasses = "w-full";

  return (
    <Card className={cn("", className)} id={id}>
      <CardHeader>
        <CardTitle>Booking Details</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="customerName" className="block text-sm font-medium mb-1">
              Your Name *
            </label>
            <Input
              id="customerName"
              name="customerName"
              value={formData.customerName}
              onChange={handleChange}
              onBlur={handleBlur}
              className={cn(inputClasses, errors.customerName && "border-destructive")}
              placeholder="John Doe"
            />
            {errors.customerName && (
              <p className="text-sm text-destructive mt-1">{errors.customerName}</p>
            )}
          </div>

          <div>
            <label htmlFor="customerPhone" className="block text-sm font-medium mb-1">
              Phone Number *
            </label>
            <Input
              id="customerPhone"
              name="customerPhone"
              type="tel"
              value={formData.customerPhone}
              onChange={handleChange}
              onBlur={handleBlur}
              className={cn(inputClasses, errors.customerPhone && "border-destructive")}
              placeholder="+1 234 567 8900"
            />
            {errors.customerPhone && (
              <p className="text-sm text-destructive mt-1">{errors.customerPhone}</p>
            )}
          </div>

          <div>
            <label htmlFor="customerEmail" className="block text-sm font-medium mb-1">
              Email (optional)
            </label>
            <Input
              id="customerEmail"
              name="customerEmail"
              type="email"
              value={formData.customerEmail}
              onChange={handleChange}
              className={cn(inputClasses)}
              placeholder="john@example.com"
            />
          </div>

          <div>
            <label htmlFor="date" className="block text-sm font-medium mb-1">
              Preferred Date & Time *
            </label>
            <Input
              id="date"
              name="date"
              type="datetime-local"
              value={formData.date}
              onChange={handleChange}
              onBlur={handleBlur}
              className={cn(inputClasses, errors.date && "border-destructive")}
            />
            {errors.date && (
              <p className="text-sm text-destructive mt-1">{errors.date}</p>
            )}
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-medium mb-1">
              Notes (optional)
            </label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              className="w-full min-h-[80px] p-2 border rounded-md"
              placeholder="Any special requests or notes..."
            />
          </div>

          <Button type="submit" className="w-full" size="lg">
            Confirm Booking
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
