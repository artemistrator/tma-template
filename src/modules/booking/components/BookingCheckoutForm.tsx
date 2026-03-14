'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useCartStore } from '@/store/cart-store';
import { useTelegramContext } from '@/lib/telegram/telegram-provider';
import { useAppConfig } from '@/context/app-config-context';
import { BookingCalendar } from './BookingCalendar';
import { TimeSlots } from './TimeSlots';

interface BookingCheckoutFormProps {
  id?: string;
  onSubmit?: (booking: {
    customerName: string;
    customerPhone: string;
    customerEmail?: string;
    date: string;
    notes?: string;
    items: { id: string; name: string; price: number; quantity: number }[];
    total: number;
    tenantId?: string;
  }) => void;
  className?: string;
}

export function BookingCheckoutForm({ id, onSubmit, className }: BookingCheckoutFormProps) {
  const { hapticFeedback, showAlert } = useTelegramContext();
  const { config } = useAppConfig();
  const shippingAddress = useCartStore((state) => state.shippingAddress);
  const setShippingAddress = useCartStore((state) => state.setShippingAddress);
  const items = useCartStore((state) => state.items);
  const total = useCartStore((state) => state.total);

  // Get service ID from first cart item
  const serviceId = items[0]?.id || '';

  const [selectedDate, setSelectedDate] = React.useState<Date>();
  const [selectedTime, setSelectedTime] = React.useState<string>();
  
  const [formData, setFormData] = React.useState({
    customerName: shippingAddress?.name || '',
    customerPhone: shippingAddress?.phone || '',
    customerEmail: shippingAddress?.address || '',
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

    // Validate date and time
    if (!selectedDate || !selectedTime) {
      hapticFeedback.error();
      showAlert('Please select date and time');
      return;
    }

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

    // Combine date + time
    const [hours, minutes] = selectedTime.split(':').map(Number);
    const bookingDate = new Date(selectedDate);
    bookingDate.setHours(hours, minutes, 0, 0);

    // Save address
    setShippingAddress({
      name: formData.customerName,
      phone: formData.customerPhone,
      address: formData.customerEmail,
      city: '',
      zipCode: '',
      country: '',
    });

    // Submit booking
    onSubmit?.({
      customerName: formData.customerName,
      customerPhone: formData.customerPhone,
      customerEmail: formData.customerEmail,
      date: bookingDate.toISOString(),
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
        <CardTitle>Book Appointment</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Step 1: Calendar */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Select Date</h3>
          <BookingCalendar
            selectedDate={selectedDate}
            onSelectDate={(date) => {
              setSelectedDate(date);
              setSelectedTime(undefined); // Reset time when date changes
              hapticFeedback.impact('light');
            }}
            minDate={new Date()}
            maxDate={new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)} // 3 months
          />
        </div>

        {/* Step 2: Time Slots */}
        {selectedDate && serviceId && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Select Time</h3>
            <TimeSlots
              date={selectedDate}
              serviceId={serviceId}
              selectedTime={selectedTime}
              onSelectTime={(time) => {
                setSelectedTime(time);
                hapticFeedback.impact('light');
              }}
            />
          </div>
        )}

        {/* Step 3: Customer Info */}
        <div className="space-y-4 pt-4 border-t">
          <h3 className="text-sm font-semibold">Your Information</h3>
          
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
        </div>

        {/* Submit Button */}
        <Button 
          type="submit" 
          className="w-full" 
          size="lg"
          onClick={handleSubmit}
          disabled={!selectedDate || !selectedTime}
        >
          {(!selectedDate || !selectedTime) ? 'Select Date & Time' : 'Confirm Booking'}
        </Button>
      </CardContent>
    </Card>
  );
}
