'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface HoursEntry {
  day: string;   // "Monday", "Monday–Friday", "Mon–Fri"
  time: string;  // "9:00–18:00" or "Closed"
}

interface WorkingHoursProps {
  id?: string;
  className?: string;
  onNavigate?: (pageId: string) => void;
  props?: {
    title?: string;
    address?: string;
    phone?: string;
    hours?: HoursEntry[];
  };
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_ABBR: Record<string, string[]> = {
  Monday:    ['monday', 'mon', 'пн'],
  Tuesday:   ['tuesday', 'tue', 'вт'],
  Wednesday: ['wednesday', 'wed', 'ср'],
  Thursday:  ['thursday', 'thu', 'чт'],
  Friday:    ['friday', 'fri', 'пт'],
  Saturday:  ['saturday', 'sat', 'сб'],
  Sunday:    ['sunday', 'sun', 'вс'],
};

function isToday(dayStr: string): boolean {
  const todayName = DAY_NAMES[new Date().getDay()];
  const lower = dayStr.toLowerCase();
  // Direct match
  if (lower.includes(todayName.toLowerCase())) return true;
  // Check abbreviated forms
  const abbrs = DAY_ABBR[todayName] ?? [];
  return abbrs.some((a) => lower.includes(a));
}

/**
 * WorkingHours — business hours block with optional address and phone.
 * Highlights today's row automatically.
 *
 * Config example:
 * {
 *   title: "Working hours",
 *   address: "123 Main St, Suite 4",
 *   phone: "+1 555-0100",
 *   hours: [
 *     { day: "Monday–Friday", time: "9:00–20:00" },
 *     { day: "Saturday",      time: "10:00–18:00" },
 *     { day: "Sunday",        time: "Closed" }
 *   ]
 * }
 */
export function WorkingHours({ id, className, props = {} }: WorkingHoursProps) {
  const { title = 'Working hours', address, phone, hours = [] } = props;

  return (
    <div id={id} className={cn('px-4 py-4 space-y-3', className)}>
      <h2 className="text-xl font-bold">{title}</h2>

      {hours.length > 0 && (
        <div className="rounded-xl border bg-card overflow-hidden">
          {hours.map((entry, i) => {
            const today = isToday(entry.day);
            const closed = entry.time.toLowerCase() === 'closed' || entry.time.toLowerCase() === 'закрыто';
            return (
              <div
                key={i}
                className={cn(
                  'flex items-center justify-between px-4 py-3 text-sm',
                  i > 0 && 'border-t',
                  today && 'bg-primary/5',
                )}
              >
                <span className={cn('font-medium', today && 'text-primary')}>
                  {today && <span className="mr-1.5 text-xs font-semibold uppercase tracking-wide text-primary">Today · </span>}
                  {entry.day}
                </span>
                <span className={cn('font-semibold', closed ? 'text-muted-foreground' : today ? 'text-primary' : '')}>
                  {entry.time}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {(address || phone) && (
        <div className="rounded-xl border bg-card divide-y text-sm">
          {address && (
            <div className="flex items-center gap-3 px-4 py-3">
              <svg className="w-4 h-4 text-muted-foreground flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-muted-foreground">{address}</span>
            </div>
          )}
          {phone && (
            <div className="flex items-center gap-3 px-4 py-3">
              <svg className="w-4 h-4 text-muted-foreground flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.947V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              <a href={`tel:${phone}`} className="text-primary font-medium">{phone}</a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
