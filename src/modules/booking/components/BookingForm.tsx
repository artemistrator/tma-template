'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface BookingFormProps {
  id?: string;
  serviceId?: string;
  serviceName?: string;
  onSubmit?: (booking: { serviceId: string; customerName: string; phone: string; email?: string; date: string; notes?: string }) => void;
  className?: string;
}

export function BookingForm({ id, serviceId, serviceName, onSubmit, className }: BookingFormProps) {
  const [formData, setFormData] = React.useState({
    customerName: '',
    phone: '',
    email: '',
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!formData.customerName.trim()) newErrors.customerName = 'Name is required';
    if (!formData.phone.trim()) newErrors.phone = 'Phone is required';
    if (!formData.date) newErrors.date = 'Date is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSubmit?.({
      serviceId: serviceId || '',
      customerName: formData.customerName,
      phone: formData.phone,
      email: formData.email || undefined,
      date: formData.date,
      notes: formData.notes || undefined,
    });
  };

  return (
    <Card className={cn("", className)} id={id}>
      <CardHeader>
        <CardTitle>{serviceName ? `Book: ${serviceName}` : 'Book Appointment'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="customerName" className="block text-sm font-medium mb-1">Your Name *</label>
            <Input id="customerName" name="customerName" value={formData.customerName} onChange={handleChange} className={cn(errors.customerName && "border-destructive")} placeholder="John Doe" />
            {errors.customerName && <p className="text-sm text-destructive mt-1">{errors.customerName}</p>}
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium mb-1">Phone Number *</label>
            <Input id="phone" name="phone" type="tel" value={formData.phone} onChange={handleChange} className={cn(errors.phone && "border-destructive")} placeholder="+1 234 567 8900" />
            {errors.phone && <p className="text-sm text-destructive mt-1">{errors.phone}</p>}
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1">Email (optional)</label>
            <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} placeholder="john@example.com" />
          </div>

          <div>
            <label htmlFor="date" className="block text-sm font-medium mb-1">Preferred Date & Time *</label>
            <Input id="date" name="date" type="datetime-local" value={formData.date} onChange={handleChange} className={cn(errors.date && "border-destructive")} />
            {errors.date && <p className="text-sm text-destructive mt-1">{errors.date}</p>}
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-medium mb-1">Notes (optional)</label>
            <textarea id="notes" name="notes" value={formData.notes} onChange={handleChange} className="w-full min-h-[80px] p-2 border rounded-md" placeholder="Any special requests..." />
          </div>

          <Button type="submit" className="w-full" size="lg">Confirm Booking</Button>
        </form>
      </CardContent>
    </Card>
  );
}
