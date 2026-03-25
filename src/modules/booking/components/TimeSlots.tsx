'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAppConfig } from '@/context/app-config-context';

interface StaffMember {
  id: string;
  name: string;
  role?: string;
  photo?: string;
}

interface SlotWithStaff {
  time: string;
  availableStaff: StaffMember[];
}

interface TimeSlotsProps {
  date: Date;
  serviceId: string;
  selectedTime?: string;
  selectedStaffId?: string;
  onSelectTime: (time: string, staffId: string | null, staffName: string | null) => void;
  onHasStaffChange?: (hasStaff: boolean) => void;
  className?: string;
}

interface AvailabilityResponse {
  success: boolean;
  slotsWithStaff?: SlotWithStaff[];
  availableSlots?: string[];
  isDayOff?: boolean;
  reason?: string;
  error?: string;
}

function Avatar({ name, photo, size = 'sm' }: { name: string; photo?: string; size?: 'sm' | 'md' }) {
  const dim = size === 'sm' ? 'w-7 h-7 text-xs' : 'w-10 h-10 text-sm';
  const initials = name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  if (photo) {
    return (
      <img
        src={photo}
        alt={name}
        className={cn('rounded-full object-cover border-2 border-background', dim)}
      />
    );
  }
  return (
    <div className={cn('rounded-full bg-primary/10 text-primary font-semibold flex items-center justify-center border-2 border-background', dim)}>
      {initials}
    </div>
  );
}

/**
 * TimeSlots — shows available time slots with staff availability.
 * - If staff data present: each slot shows who's free; click → staff picker if multiple
 * - If no staff data: plain time grid (fallback)
 */
export function TimeSlots({
  date,
  serviceId,
  selectedTime,
  selectedStaffId,
  onSelectTime,
  onHasStaffChange,
  className,
}: TimeSlotsProps) {
  const { config } = useAppConfig();
  const [slots, setSlots] = React.useState<SlotWithStaff[]>([]);
  const [hasStaff, setHasStaff] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isDayOff, setIsDayOff] = React.useState(false);
  const [dayOffReason, setDayOffReason] = React.useState<string | undefined>();

  // Staff picker state — shown inline below the selected slot
  const [pickerSlot, setPickerSlot] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchSlots = async () => {
      setLoading(true);
      setError(null);
      setIsDayOff(false);
      setPickerSlot(null);

      try {
        const dateStr = date.toISOString().split('T')[0];

        const response = await fetch('/api/bookings/check-availability', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tenantId: config?.meta.slug || 'barber',
            serviceId,
            date: dateStr,
          }),
        });

        const data: AvailabilityResponse = await response.json();

        if (!data.success) {
          setError(data.error || 'Failed to fetch slots');
          return;
        }

        if (data.isDayOff) {
          setIsDayOff(true);
          setDayOffReason(data.reason);
          setSlots([]);
          return;
        }

        const rawSlots = data.slotsWithStaff ?? (data.availableSlots ?? []).map((t) => ({ time: t, availableStaff: [] }));
        setSlots(rawSlots);
        const staffMode = rawSlots.some((s) => s.availableStaff.length > 0);
        setHasStaff(staffMode);
        onHasStaffChange?.(staffMode);
      } catch (err) {
        console.error('[TimeSlots] Error:', err);
        setError('Failed to load time slots');
      } finally {
        setLoading(false);
      }
    };

    fetchSlots();
  }, [date, serviceId, config?.meta.slug]);

  const handleSlotClick = (slot: SlotWithStaff) => {
    if (!hasStaff || slot.availableStaff.length === 0) {
      // No staff mode — just pass time with null staff
      onSelectTime(slot.time, null, null);
      setPickerSlot(null);
      return;
    }
    if (slot.availableStaff.length === 1) {
      // Single staff — auto-select
      onSelectTime(slot.time, slot.availableStaff[0].id, slot.availableStaff[0].name);
      setPickerSlot(null);
      return;
    }
    // Multiple staff — toggle picker
    setPickerSlot((prev) => (prev === slot.time ? null : slot.time));
  };

  const handleStaffPick = (slot: SlotWithStaff, staff: StaffMember) => {
    onSelectTime(slot.time, staff.id, staff.name);
    setPickerSlot(null);
  };

  // --- Loading ---
  if (loading) {
    return (
      <div className={cn('flex items-center justify-center py-8', className)}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        <span className="ml-3 text-muted-foreground text-sm">Loading times...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('p-4 text-center', className)}>
        <p className="text-destructive text-sm">{error}</p>
      </div>
    );
  }

  if (isDayOff) {
    return (
      <div className={cn('p-4 text-center rounded-lg bg-muted/50', className)}>
        <p className="font-medium text-muted-foreground">Closed on this day</p>
        {dayOffReason && <p className="text-sm text-muted-foreground mt-1">{dayOffReason}</p>}
        <p className="text-sm text-muted-foreground mt-1">Please select another date</p>
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div className={cn('p-4 text-center', className)}>
        <p className="text-muted-foreground text-sm">No available slots for this date</p>
        <p className="text-xs text-muted-foreground mt-1">Please select another date</p>
      </div>
    );
  }

  // --- No staff mode: simple grid ---
  if (!hasStaff) {
    return (
      <div className={cn('space-y-3', className)}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">Available Times</span>
          <span className="text-xs text-muted-foreground">{slots.length} slots</span>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {slots.map((slot) => (
            <Button
              key={slot.time}
              variant={selectedTime === slot.time ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleSlotClick(slot)}
              className="h-10 text-sm"
            >
              {slot.time}
            </Button>
          ))}
        </div>
        {selectedTime && (
          <div className="flex items-center gap-2 p-3 bg-green-50 text-green-700 rounded-lg text-sm">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Selected: {selectedTime}
          </div>
        )}
      </div>
    );
  }

  // --- Staff mode: slot rows with staff avatars ---
  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-semibold">Select Time & Specialist</span>
        <span className="text-xs text-muted-foreground">{slots.length} slots</span>
      </div>

      {slots.map((slot) => {
        const isSelected = selectedTime === slot.time;
        const isPickerOpen = pickerSlot === slot.time;

        return (
          <div key={slot.time}>
            {/* Slot row */}
            <button
              onClick={() => handleSlotClick(slot)}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all',
                isSelected
                  ? 'border-primary bg-primary/5 ring-1 ring-primary'
                  : 'border-border bg-card hover:border-primary/50 hover:bg-muted/30',
                isPickerOpen && !isSelected && 'border-primary/40 bg-muted/20'
              )}
            >
              {/* Time */}
              <span className={cn(
                'text-base font-bold w-14 shrink-0 tabular-nums',
                isSelected ? 'text-primary' : 'text-foreground'
              )}>
                {slot.time}
              </span>

              {/* Staff avatars */}
              <div className="flex items-center gap-1 flex-1">
                <div className="flex -space-x-2">
                  {slot.availableStaff.slice(0, 4).map((staff) => (
                    <Avatar
                      key={staff.id}
                      name={staff.name}
                      photo={staff.photo}
                      size="sm"
                    />
                  ))}
                  {slot.availableStaff.length > 4 && (
                    <div className="w-7 h-7 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs text-muted-foreground">
                      +{slot.availableStaff.length - 4}
                    </div>
                  )}
                </div>
                {slot.availableStaff.length === 1 ? (
                  <span className="text-sm text-muted-foreground ml-1">
                    {slot.availableStaff[0].name}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground ml-1">
                    {slot.availableStaff.length} specialists free
                  </span>
                )}
              </div>

              {/* Chevron / check */}
              {isSelected && selectedStaffId ? (
                <svg className="w-5 h-5 text-primary shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : slot.availableStaff.length > 1 ? (
                <svg
                  className={cn('w-4 h-4 text-muted-foreground shrink-0 transition-transform', isPickerOpen && 'rotate-180')}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              ) : null}
            </button>

            {/* Inline staff picker */}
            {isPickerOpen && slot.availableStaff.length > 1 && (
              <div className="mx-2 mt-1 mb-2 border border-primary/20 rounded-xl bg-muted/30 overflow-hidden">
                <p className="text-xs text-muted-foreground px-4 pt-3 pb-1 font-medium">
                  Choose a specialist for {slot.time}
                </p>
                {slot.availableStaff.map((staff, idx) => (
                  <button
                    key={staff.id}
                    onClick={() => handleStaffPick(slot, staff)}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-3 hover:bg-primary/5 transition-colors text-left',
                      idx !== slot.availableStaff.length - 1 && 'border-b border-border/50',
                      selectedTime === slot.time && selectedStaffId === staff.id && 'bg-primary/10'
                    )}
                  >
                    <Avatar name={staff.name} photo={staff.photo} size="md" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{staff.name}</p>
                      {staff.role && (
                        <p className="text-xs text-muted-foreground truncate">{staff.role}</p>
                      )}
                    </div>
                    {selectedTime === slot.time && selectedStaffId === staff.id && (
                      <svg className="w-4 h-4 text-primary shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Selected summary */}
      {selectedTime && selectedStaffId && (
        <div className="flex items-center gap-3 p-3 bg-green-50 text-green-800 rounded-xl mt-2">
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <div className="text-sm">
            <span className="font-semibold">{selectedTime}</span>
            {' · '}
            {slots.find((s) => s.time === selectedTime)?.availableStaff.find((st) => st.id === selectedStaffId)?.name ?? 'Specialist selected'}
          </div>
        </div>
      )}
    </div>
  );
}
