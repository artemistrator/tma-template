'use client';

import { useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export interface WorkingHourEntry {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_day_off: boolean;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const DEFAULT_HOURS: WorkingHourEntry[] = [
  { day_of_week: 0, start_time: '10:00', end_time: '18:00', is_day_off: true },
  { day_of_week: 1, start_time: '09:00', end_time: '18:00', is_day_off: false },
  { day_of_week: 2, start_time: '09:00', end_time: '18:00', is_day_off: false },
  { day_of_week: 3, start_time: '09:00', end_time: '18:00', is_day_off: false },
  { day_of_week: 4, start_time: '09:00', end_time: '18:00', is_day_off: false },
  { day_of_week: 5, start_time: '09:00', end_time: '18:00', is_day_off: false },
  { day_of_week: 6, start_time: '10:00', end_time: '16:00', is_day_off: true },
];

interface HoursEditorProps {
  hours: WorkingHourEntry[];
  onChange: (hours: WorkingHourEntry[]) => void;
}

export function HoursEditor({ hours, onChange }: HoursEditorProps) {
  const fillDefaults = useCallback(() => {
    onChange(DEFAULT_HOURS);
  }, [onChange]);

  const update = useCallback(
    (index: number, field: keyof WorkingHourEntry, value: string | boolean) => {
      const updated = [...hours];
      updated[index] = { ...updated[index], [field]: value };
      onChange(updated);
    },
    [hours, onChange],
  );

  // Auto-fill if empty on first render
  useEffect(() => {
    if (hours.length === 0) {
      onChange(DEFAULT_HOURS);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (hours.length === 0) return null;

  return (
    <div className="space-y-2">
      {hours.map((entry, i) => (
        <div
          key={entry.day_of_week}
          className="flex items-center gap-3 py-1.5"
        >
          <span className="w-10 text-sm font-medium">
            {DAY_NAMES[entry.day_of_week]}
          </span>

          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={entry.is_day_off}
              onChange={(e) => update(i, 'is_day_off', e.target.checked)}
              className="rounded"
            />
            <span className="text-xs text-muted-foreground">Off</span>
          </label>

          {!entry.is_day_off && (
            <>
              <Input
                type="time"
                value={entry.start_time}
                onChange={(e) => update(i, 'start_time', e.target.value)}
                className="w-28"
              />
              <span className="text-muted-foreground">—</span>
              <Input
                type="time"
                value={entry.end_time}
                onChange={(e) => update(i, 'end_time', e.target.value)}
                className="w-28"
              />
            </>
          )}
        </div>
      ))}

      <Button type="button" variant="ghost" size="sm" onClick={fillDefaults}>
        Reset to defaults
      </Button>
    </div>
  );
}
