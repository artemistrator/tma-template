'use client';

import { cn } from '@/lib/utils';
import type { PaymentMethod } from '@/lib/payments/yookassa';

interface PaymentMethodOption {
  id: PaymentMethod;
  label: { ru: string; en: string };
  description: { ru: string; en: string };
}

const METHOD_OPTIONS: Record<PaymentMethod, PaymentMethodOption> = {
  yookassa: {
    id: 'yookassa',
    label: { ru: 'Банковская карта', en: 'Bank Card' },
    description: { ru: 'Visa, Mastercard, МИР', en: 'Visa, Mastercard, MIR' },
  },
  stars: {
    id: 'stars',
    label: { ru: 'Telegram Stars', en: 'Telegram Stars' },
    description: { ru: 'Оплата через Telegram Stars', en: 'Pay with Telegram Stars' },
  },
  cash: {
    id: 'cash',
    label: { ru: 'Наличные', en: 'Cash on Delivery' },
    description: { ru: 'Оплата при получении', en: 'Pay when you receive' },
  },
};

function PaymentIcon({ method, className }: { method: PaymentMethod; className?: string }) {
  if (method === 'yookassa') {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
      </svg>
    );
  }
  if (method === 'stars') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    );
  }
  // cash
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
    </svg>
  );
}

interface PaymentMethodSelectorProps {
  methods: PaymentMethod[];
  selected: PaymentMethod | null;
  onSelect: (method: PaymentMethod) => void;
  locale?: string;
  className?: string;
}

export function PaymentMethodSelector({
  methods,
  selected,
  onSelect,
  locale = 'en',
  className,
}: PaymentMethodSelectorProps) {
  if (methods.length === 0) return null;

  const isRu = locale === 'ru';

  return (
    <div className={cn('space-y-2', className)}>
      <p className="text-sm font-medium mb-2">
        {isRu ? 'Способ оплаты' : 'Payment Method'}
      </p>
      {methods.map((methodId) => {
        const option = METHOD_OPTIONS[methodId];
        if (!option) return null;

        const label = isRu ? option.label.ru : option.label.en;
        const description = isRu ? option.description.ru : option.description.en;
        const isSelected = selected === methodId;

        // Stars gets a special amber color
        const isStars = methodId === 'stars';

        return (
          <button
            key={methodId}
            type="button"
            onClick={() => onSelect(methodId)}
            className={cn(
              'w-full flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all',
              isSelected
                ? isStars
                  ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/20 ring-1 ring-amber-400'
                  : 'border-primary bg-primary/5 ring-1 ring-primary'
                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-600',
            )}
          >
            {/* Icon */}
            <div className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors',
              isSelected
                ? isStars
                  ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-500'
                  : 'bg-primary/10 text-primary'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-500',
            )}>
              <PaymentIcon method={methodId} className="w-5 h-5" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className={cn(
                'text-sm font-medium',
                isSelected && (isStars ? 'text-amber-700 dark:text-amber-400' : 'text-primary'),
              )}>
                {label}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
            </div>

            {/* Radio */}
            <div className={cn(
              'w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors',
              isSelected
                ? isStars
                  ? 'border-amber-400 bg-amber-400'
                  : 'border-primary bg-primary'
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
