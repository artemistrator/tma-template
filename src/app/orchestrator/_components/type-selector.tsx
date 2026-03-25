'use client';

import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { AppType } from './brief-form';

const APP_TYPES: Array<{
  value: AppType;
  title: string;
  description: string;
  examples: string;
}> = [
  {
    value: 'ecommerce',
    title: 'E-commerce',
    description: 'Online store with products, cart and checkout',
    examples: 'Pizza shop, clothing store, electronics',
  },
  {
    value: 'booking',
    title: 'Booking',
    description: 'Service booking with calendar and time slots',
    examples: 'Barbershop, spa, dental clinic, tutor',
  },
  {
    value: 'infobiz',
    title: 'Info Products',
    description: 'Courses, PDFs, articles, consultations',
    examples: 'Online school, coaching, digital products',
  },
];

interface TypeSelectorProps {
  value: AppType | null;
  onChange: (type: AppType) => void;
}

export function TypeSelector({ value, onChange }: TypeSelectorProps) {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-3">Choose App Type</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {APP_TYPES.map((type) => (
          <Card
            key={type.value}
            className={cn(
              'cursor-pointer transition-all hover:shadow-md',
              value === type.value
                ? 'ring-2 ring-primary border-primary'
                : 'hover:border-primary/50',
            )}
            onClick={() => onChange(type.value)}
          >
            <CardContent className="p-4">
              <h3 className="font-semibold text-base">{type.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {type.description}
              </p>
              <p className="text-xs text-muted-foreground mt-2 italic">
                {type.examples}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
