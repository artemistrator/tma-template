'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useCartStore } from '@/store/cart-store';
import { useTelegramContext } from '@/lib/telegram/telegram-provider';
import { useAppConfig } from '@/context/app-config-context';
import { useTranslation } from '@/lib/use-translation';
import { BookingCalendar } from './BookingCalendar';
import { TimeSlots } from './TimeSlots';
import { Loader2 } from 'lucide-react';

interface BookingCheckoutFormProps {
  id?: string;
  className?: string;
  onNavigate?: (pageId: string) => void;
  // props от renderer передаются сюда
  props?: Record<string, unknown>;
}

export function BookingCheckoutForm({ id, className, onNavigate }: BookingCheckoutFormProps) {
  const { hapticFeedback, showAlert } = useTelegramContext();
  const { config } = useAppConfig();
  const { t } = useTranslation();
  const shippingAddress = useCartStore((state) => state.shippingAddress);
  const setShippingAddress = useCartStore((state) => state.setShippingAddress);
  const items = useCartStore((state) => state.items);
  const clearCart = useCartStore((state) => state.clearCart);
  const addOrder = useCartStore((state) => state.addOrder);

  // Get service ID from first cart item
  const serviceId = items[0]?.id || '';
  const serviceName = items[0]?.name || '';

  const [selectedDate, setSelectedDate] = React.useState<Date>();
  const [selectedTime, setSelectedTime] = React.useState<string>();
  const [selectedStaff, setSelectedStaff] = React.useState<{ id: string; name: string } | null>(null);
  const [hasStaffMode, setHasStaffMode] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const [formData, setFormData] = React.useState({
    customerName: shippingAddress?.name || '',
    customerPhone: shippingAddress?.phone || '',
    customerEmail: '',
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
        return value.length < 2 ? t('validation.nameMin') : null;
      case 'customerPhone':
        return value.length < 10 ? t('validation.phoneInvalid') : null;
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    hapticFeedback.impact('medium');

    // Validate date and time
    if (!selectedDate || !selectedTime) {
      hapticFeedback.error();
      showAlert(t('validation.selectDateTime'));
      return;
    }

    // Validate staff selection (only required if staff data is available)
    // selectedStaff can be null in no-staff mode — that's fine

    // Validate form fields
    const newErrors: Record<string, string> = {};
    ['customerName', 'customerPhone'].forEach((key) => {
      const error = validateField(key, formData[key as keyof typeof formData]);
      if (error) newErrors[key] = error;
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      hapticFeedback.error();
      showAlert(t('validation.fillRequired'));
      return;
    }

    // Build local datetime string WITHOUT UTC conversion so the server sees the
    // exact time the user selected (e.g. "2026-03-16T09:00:00", no "Z" suffix).
    const [hours, minutes] = selectedTime.split(':').map(Number);
    const pad = (n: number) => String(n).padStart(2, '0');
    const localDateStr = `${selectedDate.getFullYear()}-${pad(selectedDate.getMonth() + 1)}-${pad(selectedDate.getDate())}T${pad(hours)}:${pad(minutes)}:00`;

    // Save address to store (for reference)
    setShippingAddress({
      name: formData.customerName,
      phone: formData.customerPhone,
      email: formData.customerEmail,
      address: '',
      city: '',
      zipCode: '',
      country: '',
    });

    setIsSubmitting(true);
    const abort = new AbortController();
    const timeoutId = setTimeout(() => abort.abort(), 30_000);

    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        signal: abort.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: config?.meta.slug || 'barber',
          serviceId,
          customerName: formData.customerName,
          phone: formData.customerPhone,
          email: formData.customerEmail || '',
          date: localDateStr,
          notes: formData.notes,
          staffId: selectedStaff?.id ?? null,
          staffName: selectedStaff?.name ?? null,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to create booking');
      }

      hapticFeedback.success();

      // Save to local order store so order-details page can display it
      addOrder({
        id: result.bookingId,
        items: [...items],
        total: 0,
        shippingAddress: {
          name: formData.customerName,
          phone: formData.customerPhone,
          email: formData.customerEmail,
          address: '',
          city: '',
          zipCode: '',
          country: '',
        },
        status: 'pending',
        createdAt: new Date().toISOString(),
        bookingDate: localDateStr,
        bookingTime: selectedTime,
        bookingService: serviceName,
      });

      clearCart();

      // Navigate to booking success page
      onNavigate?.('booking-success');
    } catch (error) {
      hapticFeedback.error();
      if (error instanceof Error && error.name === 'AbortError') {
        showAlert(t('validation.timeout'));
      } else {
        showAlert(error instanceof Error ? error.message : t('validation.bookingFailed'));
      }
    } finally {
      clearTimeout(timeoutId);
      setIsSubmitting(false);
    }
  };

  const inputClasses = 'w-full';
  const canSubmit = !!selectedDate && !!selectedTime && !isSubmitting && (!hasStaffMode || !!selectedStaff);

  return (
    <Card className={cn('', className)} id={id}>
      <CardHeader>
        <CardTitle>{t('booking.title')}</CardTitle>
        {serviceName && (
          <p className="text-sm text-muted-foreground">{t('booking.service')}: {serviceName}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Step 1: Calendar */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">{t('booking.selectDate')}</h3>
          <BookingCalendar
            selectedDate={selectedDate}
            onSelectDate={(date) => {
              setSelectedDate(date);
              setSelectedTime(undefined);
              setSelectedStaff(null);
              hapticFeedback.impact('light');
            }}
            minDate={new Date()}
            maxDate={new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)}
          />
        </div>

        {/* Step 2: Time Slots + Staff */}
        {selectedDate && serviceId && (
          <div className="space-y-2">
            <TimeSlots
              date={selectedDate}
              serviceId={serviceId}
              selectedTime={selectedTime}
              selectedStaffId={selectedStaff?.id}
              onSelectTime={(time, staffId, staffName) => {
                setSelectedTime(time);
                setSelectedStaff(staffId ? { id: staffId, name: staffName! } : null);
                hapticFeedback.impact('light');
              }}
              onHasStaffChange={setHasStaffMode}
            />
          </div>
        )}

        {/* Step 3: Customer Info */}
        <div className="space-y-4 pt-4 border-t">
          <h3 className="text-sm font-semibold">{t('booking.yourInfo')}</h3>

          <div>
            <label htmlFor="customerName" className="block text-sm font-medium mb-1">
              {t('booking.nameLabel')} *
            </label>
            <Input
              id="customerName"
              name="customerName"
              value={formData.customerName}
              onChange={handleChange}
              onBlur={handleBlur}
              className={cn(inputClasses, errors.customerName && 'border-destructive')}
              placeholder="John Doe"
            />
            {errors.customerName && (
              <p className="text-sm text-destructive mt-1">{errors.customerName}</p>
            )}
          </div>

          <div>
            <label htmlFor="customerPhone" className="block text-sm font-medium mb-1">
              {t('booking.phonelabel')} *
            </label>
            <Input
              id="customerPhone"
              name="customerPhone"
              type="tel"
              value={formData.customerPhone}
              onChange={handleChange}
              onBlur={handleBlur}
              className={cn(inputClasses, errors.customerPhone && 'border-destructive')}
              placeholder="+1 234 567 8900"
            />
            {errors.customerPhone && (
              <p className="text-sm text-destructive mt-1">{errors.customerPhone}</p>
            )}
          </div>

          <div>
            <label htmlFor="customerEmail" className="block text-sm font-medium mb-1">
              {t('booking.emailLabel')}
            </label>
            <Input
              id="customerEmail"
              name="customerEmail"
              type="email"
              value={formData.customerEmail}
              onChange={handleChange}
              className={inputClasses}
              placeholder="john@example.com"
            />
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-medium mb-1">
              {t('booking.notesLabel')}
            </label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              className="w-full min-h-[80px] p-2 border rounded-md"
              placeholder={t('booking.notesPlaceholder')}
            />
          </div>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          className="w-full"
          size="lg"
          onClick={handleSubmit}
          disabled={!canSubmit}
        >
          {isSubmitting ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>{t('booking.confirming')}</span>
            </div>
          ) : !selectedDate || !selectedTime ? (
            t('booking.selectDateAndTime')
          ) : (
            t('booking.confirmBooking')
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
