'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import type { AppType } from './brief-form';

export type EcommerceScenario = 'quick_order' | 'catalog_browse' | 'promo_first';
export type BookingScenario = 'choose_service' | 'choose_master' | 'choose_time';
export type InfobizScenario = 'buy_course' | 'browse_catalog' | 'lead_first';
export type HomeScenario = EcommerceScenario | BookingScenario | InfobizScenario;

interface ScenarioOption {
  id: HomeScenario;
  label: string;
  desc: string;
  flow: string;
}

const ECOMMERCE_SCENARIOS: ScenarioOption[] = [
  { id: 'quick_order', label: 'Quick Order', desc: 'Focus on bestsellers and fast checkout', flow: 'Hero → Promo → Hits → CTA' },
  { id: 'catalog_browse', label: 'Catalog Browse', desc: 'Categories first, explore the full range', flow: 'Hero → Categories → Full catalog' },
  { id: 'promo_first', label: 'Promo First', desc: 'Lead with promotions and deals', flow: 'Promo banner → Deals → Products' },
];

const BOOKING_SCENARIOS: ScenarioOption[] = [
  { id: 'choose_service', label: 'Choose Service', desc: 'Services first, then pick a specialist', flow: 'Hero → Services → Staff' },
  { id: 'choose_master', label: 'Choose Master', desc: 'Specialists first, then their services', flow: 'Hero → Staff → Services' },
  { id: 'choose_time', label: 'Choose Time', desc: 'Calendar-first, find available slots', flow: 'Hero → Working hours → Services' },
];

const INFOBIZ_SCENARIOS: ScenarioOption[] = [
  { id: 'buy_course', label: 'Buy Course', desc: 'Feature one product with social proof', flow: 'Hero → Featured → Reviews → CTA' },
  { id: 'browse_catalog', label: 'Browse Catalog', desc: 'Show all products, let user explore', flow: 'Hero → All products → Features' },
  { id: 'lead_first', label: 'Lead First', desc: 'Capture leads before showing catalog', flow: 'Hero → Lead form → Products' },
];

function getScenariosForType(appType: AppType): ScenarioOption[] {
  switch (appType) {
    case 'ecommerce': return ECOMMERCE_SCENARIOS;
    case 'booking': return BOOKING_SCENARIOS;
    case 'infobiz': return INFOBIZ_SCENARIOS;
  }
}

export function getDefaultScenario(appType: AppType): HomeScenario {
  switch (appType) {
    case 'ecommerce': return 'quick_order';
    case 'booking': return 'choose_service';
    case 'infobiz': return 'buy_course';
  }
}

interface ScenarioSelectorProps {
  appType: AppType;
  value: HomeScenario;
  onChange: (value: HomeScenario) => void;
}

export function ScenarioSelector({ appType, value, onChange }: ScenarioSelectorProps) {
  const scenarios = getScenariosForType(appType);

  return (
    <div className="grid gap-3">
      {scenarios.map((s) => {
        const active = value === s.id;
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onChange(s.id)}
            className={cn(
              'w-full rounded-2xl border-2 p-4 text-left transition-all',
              active
                ? 'border-zinc-900 bg-zinc-50'
                : 'border-zinc-200 bg-white hover:border-zinc-300',
            )}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">{s.label}</div>
                <div className="text-xs text-zinc-500 mt-0.5">{s.desc}</div>
              </div>
              <div className={cn(
                'h-4 w-4 rounded-full border-2 flex items-center justify-center',
                active ? 'border-zinc-900' : 'border-zinc-300',
              )}>
                {active && <div className="h-2 w-2 rounded-full bg-zinc-900" />}
              </div>
            </div>
            <div className="mt-2 text-[11px] text-zinc-400 font-mono">{s.flow}</div>
          </button>
        );
      })}
    </div>
  );
}
