'use client';

import type { AppType } from './brief-form';

export type SectionKey =
  | 'heroBanner'
  | 'promo'
  | 'categories'
  | 'products'
  | 'staff'
  | 'hours'
  | 'features'
  | 'testimonials'
  | 'contacts'
  | 'stickyCta'
  // Infobiz-specific
  | 'stats'
  | 'faq'
  | 'leadForm';

export type SectionsVisibility = Partial<Record<SectionKey, boolean>>;

interface SectionDef {
  key: SectionKey;
  label: string;
  emoji: string;
  /** Cannot be disabled */
  locked?: boolean;
}

const ECOMMERCE_SECTIONS: SectionDef[] = [
  { key: 'heroBanner', label: 'Hero Banner', emoji: '🎨', locked: true },
  { key: 'promo', label: 'Promo Banner', emoji: '🎉' },
  { key: 'categories', label: 'Categories', emoji: '📂' },
  { key: 'products', label: 'Products', emoji: '📦', locked: true },
  { key: 'features', label: 'Why Choose Us', emoji: '⭐' },
  { key: 'testimonials', label: 'Testimonials', emoji: '💬' },
  { key: 'contacts', label: 'Contacts', emoji: '📞' },
  { key: 'stickyCta', label: 'Sticky CTA', emoji: '🔘' },
];

const BOOKING_SECTIONS: SectionDef[] = [
  { key: 'heroBanner', label: 'Hero Banner', emoji: '🎨', locked: true },
  { key: 'products', label: 'Services', emoji: '💇', locked: true },
  { key: 'staff', label: 'Staff', emoji: '👤' },
  { key: 'hours', label: 'Working Hours', emoji: '🕐' },
  { key: 'features', label: 'Why Choose Us', emoji: '⭐' },
  { key: 'testimonials', label: 'Testimonials', emoji: '💬' },
  { key: 'contacts', label: 'Contacts', emoji: '📞' },
  { key: 'stickyCta', label: 'Sticky CTA', emoji: '🔘' },
];

const INFOBIZ_SECTIONS: SectionDef[] = [
  { key: 'heroBanner', label: 'Hero Banner', emoji: '🎨', locked: true },
  { key: 'stats', label: 'Stats Row', emoji: '📊' },
  { key: 'products', label: 'Products', emoji: '📚', locked: true },
  { key: 'features', label: 'What You Get', emoji: '⭐' },
  { key: 'testimonials', label: 'Testimonials', emoji: '💬' },
  { key: 'faq', label: 'FAQ', emoji: '❓' },
  { key: 'leadForm', label: 'Lead Form', emoji: '📝' },
  { key: 'contacts', label: 'Contacts', emoji: '📞' },
  { key: 'stickyCta', label: 'Sticky CTA', emoji: '🔘' },
];

function getSectionsForType(appType: AppType): SectionDef[] {
  switch (appType) {
    case 'ecommerce': return ECOMMERCE_SECTIONS;
    case 'booking': return BOOKING_SECTIONS;
    case 'infobiz': return INFOBIZ_SECTIONS;
  }
}

export function getDefaultSectionOrder(appType: AppType): SectionKey[] {
  return getSectionsForType(appType).map(s => s.key);
}

interface SectionsEditorProps {
  appType: AppType;
  sections: SectionsVisibility;
  sectionOrder: SectionKey[];
  onSectionsChange: (sections: SectionsVisibility) => void;
  onOrderChange: (order: SectionKey[]) => void;
}

export function SectionsEditor({
  appType,
  sections,
  sectionOrder,
  onSectionsChange,
  onOrderChange,
}: SectionsEditorProps) {
  const defs = getSectionsForType(appType);

  // Build ordered list based on sectionOrder, falling back to defaults for missing keys
  const defMap = new Map(defs.map(d => [d.key, d]));
  const orderedKeys = sectionOrder.filter(k => defMap.has(k));
  // Add any keys from defs not in sectionOrder (safety net)
  for (const d of defs) {
    if (!orderedKeys.includes(d.key)) orderedKeys.push(d.key);
  }

  const toggleSection = (key: SectionKey) => {
    const current = sections[key] ?? true;
    onSectionsChange({ ...sections, [key]: !current });
  };

  const moveUp = (idx: number) => {
    if (idx <= 0) return;
    const next = [...orderedKeys];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    onOrderChange(next);
  };

  const moveDown = (idx: number) => {
    if (idx >= orderedKeys.length - 1) return;
    const next = [...orderedKeys];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    onOrderChange(next);
  };

  return (
    <div className="space-y-1">
      {orderedKeys.map((key, idx) => {
        const def = defMap.get(key);
        if (!def) return null;
        const enabled = sections[key] ?? true;

        return (
          <div
            key={key}
            className={`flex items-center gap-3 rounded-2xl border px-3 py-2.5 transition-colors ${
              enabled
                ? 'border-zinc-200 bg-white'
                : 'border-zinc-100 bg-zinc-50 opacity-60'
            }`}
          >
            {/* Reorder buttons */}
            <div className="flex flex-col gap-0.5">
              <button
                type="button"
                onClick={() => moveUp(idx)}
                disabled={idx === 0}
                className="text-zinc-400 hover:text-zinc-700 disabled:opacity-20 text-xs leading-none"
                title="Move up"
              >
                ▲
              </button>
              <button
                type="button"
                onClick={() => moveDown(idx)}
                disabled={idx === orderedKeys.length - 1}
                className="text-zinc-400 hover:text-zinc-700 disabled:opacity-20 text-xs leading-none"
                title="Move down"
              >
                ▼
              </button>
            </div>

            {/* Toggle */}
            <label className="flex items-center gap-2.5 flex-1 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={enabled}
                disabled={def.locked}
                onChange={() => toggleSection(key)}
                className="h-4 w-4 rounded border-zinc-300 disabled:opacity-50"
              />
              <span className="text-base">{def.emoji}</span>
              <span className="text-sm font-medium">{def.label}</span>
              {def.locked && (
                <span className="text-[10px] uppercase tracking-wider text-zinc-400 ml-1">required</span>
              )}
            </label>
          </div>
        );
      })}
    </div>
  );
}
