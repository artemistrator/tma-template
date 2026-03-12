'use client';

import React from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import Image from 'next/image';

export interface Service {
  id: string | number;
  name: string;
  price: number;
  duration?: number;
  description?: string;
  category?: string;
  image?: string;
  badge?: string;
}

interface ServiceListProps {
  id?: string;
  title?: string;
  description?: string;
  data?: Service[];
  props?: {
    data?: Service[];
    title?: string;
    description?: string;
    columns?: 1 | 2 | 3;
  };
  columns?: 1 | 2 | 3;
  onServiceClick?: (serviceId: string) => void;
  onBook?: (serviceId: string) => void;
  className?: string;
  emptyMessage?: string;
}

export function ServiceList({
  id,
  title,
  description,
  data: directData,
  props,
  columns = 2,
  onServiceClick,
  onBook,
  className,
  emptyMessage = "No services available",
}: ServiceListProps) {
  const data = props?.data || directData || [];
  const pageColumns = (props?.columns as 1 | 2 | 3) || columns;
  const pageTitle = props?.title || title;
  const pageDescription = props?.description || description;

  const gridCols = { 1: "grid-cols-1", 2: "grid-cols-2", 3: "grid-cols-3" };

  if (data.length === 0) {
    return (
      <div className={cn("text-center py-12", className)} id={id}>
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
          <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)} id={id}>
      {(pageTitle || pageDescription) && (
        <div>
          {pageTitle && <h2 className="text-xl font-bold">{pageTitle}</h2>}
          {pageDescription && <p className="text-muted-foreground">{pageDescription}</p>}
        </div>
      )}

      <div className={cn("grid gap-4", gridCols[pageColumns])}>
        {data.map((service) => (
          <Card
            key={service.id}
            className="overflow-hidden cursor-pointer transition-all hover:shadow-lg active:scale-[0.98]"
            onClick={() => onServiceClick?.(String(service.id))}
          >
            {service.image && (
              <div className="aspect-square bg-muted relative overflow-hidden">
                <Image src={service.image} alt={service.name} fill className="object-cover" sizes="(max-width: 768px) 50vw" />
                {service.badge && <Badge className="absolute top-2 left-2" variant="secondary">{service.badge}</Badge>}
              </div>
            )}

            <CardContent className="p-4">
              {service.category && <p className="text-xs text-muted-foreground mb-1">{service.category}</p>}
              <h3 className="font-semibold text-base line-clamp-2">{service.name}</h3>
              {service.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{service.description}</p>}
              {service.duration && <p className="text-xs text-muted-foreground mt-1">⏱️ {service.duration} min</p>}
            </CardContent>

            <CardFooter className="p-4 pt-0 flex items-center justify-between gap-2">
              <span className="text-lg font-bold">${service.price.toFixed(2)}</span>
              <Button size="sm" onClick={(e) => { e.stopPropagation(); onBook?.(String(service.id)); }} className="flex-1">Book</Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
