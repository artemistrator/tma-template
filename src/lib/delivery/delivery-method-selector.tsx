'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import type { DeliveryOption } from '@/lib/delivery/types';

interface DeliveryMethodSelectorProps {
  options: DeliveryOption[];
  selected: string | null;
  onSelect: (option: DeliveryOption) => void;
  loading?: boolean;
  locale?: string;
  currency?: string;
  className?: string;
}

const TYPE_LABELS: Record<string, { ru: string; en: string }> = {
  pickup: { ru: 'Самовывоз', en: 'Pickup' },
  courier: { ru: 'Курьер', en: 'Courier' },
  cdek: { ru: 'СДЭК', en: 'CDEK' },
};

function DeliveryIcon({ type, className }: { type: string; className?: string }) {
  if (type === 'pickup') {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016c.896 0 1.7-.393 2.25-1.015a3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72l1.189-1.19A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72M6.75 18h3.75a.75.75 0 0 0 .75-.75V13.5a.75.75 0 0 0-.75-.75H6.75a.75.75 0 0 0-.75.75v3.75c0 .414.336.75.75.75Z" />
      </svg>
    );
  }
  if (type === 'courier') {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
      </svg>
    );
  }
  // cdek / default
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
    </svg>
  );
}

export function DeliveryMethodSelector({
  options,
  selected,
  onSelect,
  loading = false,
  locale = 'en',
  currency = 'RUB',
  className,
}: DeliveryMethodSelectorProps) {
  const isRu = locale === 'ru';

  if (loading) {
    return (
      <div className={cn('space-y-2', className)}>
        <p className="text-sm font-medium mb-2">
          {isRu ? 'Способ доставки' : 'Delivery Method'}
        </p>
        {[1, 2].map(i => (
          <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (options.length === 0) {
    return null;
  }

  const formatPrice = (price: number) => {
    if (price === 0) return isRu ? 'Бесплатно' : 'Free';
    return new Intl.NumberFormat(isRu ? 'ru-RU' : 'en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div className={cn('space-y-2', className)}>
      <p className="text-sm font-medium mb-2">
        {isRu ? 'Способ доставки' : 'Delivery Method'}
      </p>

      {options.map((option) => {
        const isSelected = selected === option.id;
        const labels = TYPE_LABELS[option.type] || { ru: option.type, en: option.type };

        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onSelect(option)}
            className={cn(
              'w-full flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all',
              isSelected
                ? 'border-primary bg-primary/5 ring-1 ring-primary'
                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-600',
            )}
          >
            {/* Icon */}
            <div className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors',
              isSelected
                ? 'bg-primary/10 text-primary'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-500',
            )}>
              <DeliveryIcon type={option.type} className="w-5 h-5" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className={cn(
                  'text-sm font-medium',
                  isSelected && 'text-primary',
                )}>
                  {option.name || (isRu ? labels.ru : labels.en)}
                </p>
                <span className={cn(
                  'text-sm font-semibold shrink-0',
                  option.price === 0
                    ? 'text-green-600'
                    : isSelected ? 'text-primary' : 'text-gray-700 dark:text-gray-300',
                )}>
                  {formatPrice(option.price)}
                </span>
              </div>
              {option.description && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                  {option.description}
                </p>
              )}
              {option.estimatedDays && (
                <p className="text-xs text-gray-400 mt-0.5">
                  {isRu ? `Срок: ${option.estimatedDays}` : option.estimatedDays}
                </p>
              )}
            </div>

            {/* Radio */}
            <div className={cn(
              'w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors',
              isSelected
                ? 'border-primary bg-primary'
                : 'border-gray-300 dark:border-gray-600',
            )}>
              {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
            </div>
          </button>
        );
      })}
    </div>
  );
}
