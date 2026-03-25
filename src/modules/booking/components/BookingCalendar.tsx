'use client';

import React from 'react';
import { DayPicker } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { useAppConfig } from '@/context/app-config-context';

// Import react-day-picker styles
import 'react-day-picker/dist/style.css';

interface BookingCalendarProps {
  selectedDate?: Date;
  onSelectDate: (date: Date) => void;
  bookedDates?: Date[];
  minDate?: Date;
  maxDate?: Date;
  className?: string;
}

/**
 * BookingCalendar - Telegram-themed calendar for booking
 * Uses react-day-picker with Telegram theme colors
 */
export function BookingCalendar({
  selectedDate,
  onSelectDate,
  bookedDates = [],
  minDate,
  maxDate,
  className,
}: BookingCalendarProps) {
  const { config } = useAppConfig();
  const [blockedDateStringsFromApi, setBlockedDateStringsFromApi] = React.useState<Set<string>>(new Set());
  const [dayOffWeekdays, setDayOffWeekdays] = React.useState<Set<number>>(new Set());

  // Fetch blocked dates and day-off weekdays on mount
  React.useEffect(() => {
    const tenantId = config?.meta?.slug;
    if (!tenantId) return;

    fetch(`/api/bookings/blocked-dates?tenantId=${tenantId}`)
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setBlockedDateStringsFromApi(new Set((data.blockedDates as { date: string }[]).map(b => b.date)));
          setDayOffWeekdays(new Set(data.dayOffWeekdays as number[]));
        }
      })
      .catch(e => console.warn('[BookingCalendar] Could not fetch blocked dates:', e));
  }, [config?.meta?.slug]);

  // Convert booked dates to date strings for comparison
  const bookedDateStrings = React.useMemo(() => {
    return new Set(bookedDates.map(d => d.toISOString().split('T')[0]));
  }, [bookedDates]);

  // Custom day content to show booked indicator
  const DayContent = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    const isBooked = bookedDateStrings.has(dateStr);
    const isToday = date.toDateString() === new Date().toDateString();

    return (
      <div className={cn(
        "relative w-full h-full flex items-center justify-center",
        isBooked && "opacity-50"
      )}>
        <span>{date.getDate()}</span>
        {isBooked && (
          <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-red-500 rounded-full" />
        )}
        {isToday && (
          <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-blue-500 rounded-full" />
        )}
      </div>
    );
  };

  return (
    <div className={cn("booking-calendar", className)}>
      <style jsx global>{`
        .booking-calendar {
          --rdp-background-color: var(--tg-bg, #ffffff);
          --rdp-accent-color: var(--tg-button, #007AFF);
          --rdp-text-color: var(--tg-text, #000000);
          --rdp-selected-color: var(--tg-button, #007AFF);
          --rdp-selected-text-color: var(--tg-button-text, #ffffff);
          --rdp-today-color: var(--tg-secondary-bg, #efefef);
          --rdp-outside-color: var(--tg-hint, #999999);
          --rdp-day-size: 40px;
          --rdp-day-font-size: 14px;
        }

        .booking-calendar .rdp {
          background-color: var(--rdp-background-color);
          color: var(--rdp-text-color);
          margin: 0;
          padding: 0;
        }

        .booking-calendar .rdp-root {
          width: 100%;
        }

        .booking-calendar .rdp-months {
          display: flex;
          flex-direction: column;
          gap: 0;
        }

        .booking-calendar .rdp-month {
          padding: 0;
        }

        .booking-calendar .rdp-month_caption {
          color: var(--rdp-text-color);
          font-size: 16px;
          font-weight: 600;
          padding: 8px 0;
        }

        .booking-calendar .rdp-weekdays {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          margin-bottom: 8px;
        }

        .booking-calendar .rdp-weekday {
          color: var(--rdp-outside-color);
          font-size: 12px;
          font-weight: 500;
          text-transform: uppercase;
          padding: 8px 0;
        }

        .booking-calendar .rdp-week {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 2px;
        }

        .booking-calendar .rdp-day {
          width: var(--rdp-day-size);
          height: var(--rdp-day-size);
          font-size: var(--rdp-day-font-size);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          user-select: none;
          touch-action: manipulation;
        }

        .booking-calendar .rdp-day:hover:not([disabled]) {
          background-color: var(--rdp-today-color);
        }

        .booking-calendar .rdp-day[aria-selected="true"] {
          background-color: var(--rdp-selected-color);
          color: var(--rdp-selected-text-color);
          font-weight: 600;
        }

        .booking-calendar .rdp-day[disabled] {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .booking-calendar .rdp-day_outside {
          color: var(--rdp-outside-color);
        }

        .booking-calendar .rdp-day_today {
          background-color: var(--rdp-today-color);
          font-weight: 600;
        }

        /* Mobile optimizations */
        @media (max-width: 640px) {
          .booking-calendar {
            --rdp-day-size: 36px;
            --rdp-day-font-size: 13px;
          }
        }

        @media (max-width: 380px) {
          .booking-calendar {
            --rdp-day-size: 32px;
            --rdp-day-font-size: 12px;
          }
        }
      `}</style>

      <DayPicker
        mode="single"
        selected={selectedDate}
        onSelect={(date) => {
          if (date) {
            onSelectDate(date);
          }
        }}
        disabled={(date) => {
          const dateStr = date.toISOString().split('T')[0];
          return (
            bookedDateStrings.has(dateStr) ||
            blockedDateStringsFromApi.has(dateStr) ||
            dayOffWeekdays.has(date.getDay())
          );
        }}
        minDate={minDate || new Date()}
        maxDate={maxDate}
        components={{
          DayContent: (props) => <DayContent {...props} />,
        }}
        className="booking-calendar"
      />
    </div>
  );
}
