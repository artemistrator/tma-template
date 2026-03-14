'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAppConfig } from '@/context/app-config-context';

interface TimeSlotsProps {
  date: Date;
  serviceId: string;
  selectedTime?: string;
  onSelectTime: (time: string) => void;
  className?: string;
}

interface TimeSlot {
  time: string;
  available: boolean;
}

/**
 * TimeSlots - Available time slots for selected date
 * Fetches available slots from API and displays as buttons
 */
export function TimeSlots({
  date,
  serviceId,
  selectedTime,
  onSelectTime,
  className,
}: TimeSlotsProps) {
  const { config } = useAppConfig();
  const [slots, setSlots] = React.useState<TimeSlot[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchSlots = async () => {
      setLoading(true);
      setError(null);

      try {
        const dateStr = date.toISOString().split('T')[0];
        
        const response = await fetch('/api/bookings/check-availability', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tenantId: config?.meta.tenantId || 'barber',
            serviceId,
            date: dateStr,
          }),
        });

        const data = await response.json();

        if (!data.success) {
          setError(data.error || 'Failed to fetch slots');
          return;
        }

        // Convert available slots to TimeSlot array
        const availableSlots: TimeSlot[] = data.availableSlots.map((time: string) => ({
          time,
          available: true,
        }));

        setSlots(availableSlots);
      } catch (err) {
        console.error('[TimeSlots] Error fetching slots:', err);
        setError('Failed to load time slots');
      } finally {
        setLoading(false);
      }
    };

    fetchSlots();
  }, [date, serviceId, config?.meta.tenantId]);

  const handleSelect = (time: string) => {
    onSelectTime(time);
  };

  if (loading) {
    return (
      <div className={cn("time-slots-loading", className)}>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-3 text-muted-foreground">Loading available times...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("time-slots-error p-4 text-center", className)}>
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div className={cn("time-slots-empty p-4 text-center", className)}>
        <p className="text-muted-foreground">No available slots for this date</p>
        <p className="text-sm text-muted-foreground mt-1">Please select another date</p>
      </div>
    );
  }

  return (
    <div className={cn("time-slots space-y-3", className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Available Times</h3>
        <span className="text-xs text-muted-foreground">
          {slots.length} slot{slots.length !== 1 ? 's' : ''} available
        </span>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
        {slots.map((slot) => (
          <Button
            key={slot.time}
            variant={selectedTime === slot.time ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleSelect(slot.time)}
            disabled={!slot.available}
            className={cn(
              "h-10 text-sm",
              !slot.available && "opacity-50 cursor-not-allowed",
              selectedTime === slot.time && "bg-primary text-primary-foreground"
            )}
          >
            {slot.time}
          </Button>
        ))}
      </div>

      {selectedTime && (
        <div className="flex items-center gap-2 p-3 bg-green-50 text-green-700 rounded-lg">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-sm font-medium">Selected: {selectedTime}</span>
        </div>
      )}
    </div>
  );
}
