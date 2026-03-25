'use client';

import { Input } from '@/components/ui/input';

export interface PromoData {
  title: string;
  subtitle: string;
  ctaText: string;
  emoji: string;
}

interface PromoEditorProps {
  promo: PromoData | null;
  onChange: (promo: PromoData | null) => void;
}

export function PromoEditor({ promo, onChange }: PromoEditorProps) {
  if (!promo) {
    return (
      <button
        type="button"
        onClick={() =>
          onChange({ title: '', subtitle: '', ctaText: '', emoji: '🎉' })
        }
        className="w-full rounded-2xl border-2 border-dashed border-zinc-300 bg-zinc-50 p-6 text-center text-sm text-zinc-500 hover:border-zinc-400 hover:text-zinc-600 transition-colors"
      >
        + Add promo banner (optional)
      </button>
    );
  }

  function update(field: keyof PromoData, value: string) {
    if (!promo) return;
    onChange({ ...promo, [field]: value });
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Promo Banner</span>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="text-xs text-zinc-400 hover:text-red-500 transition-colors"
        >
          Remove
        </button>
      </div>
      <div className="grid grid-cols-[60px_1fr] gap-3">
        <div>
          <label className="text-xs text-zinc-500 mb-1 block">Emoji</label>
          <Input
            value={promo.emoji}
            onChange={(e) => update('emoji', e.target.value)}
            className="text-center text-lg rounded-xl"
            maxLength={4}
          />
        </div>
        <div>
          <label className="text-xs text-zinc-500 mb-1 block">Title</label>
          <Input
            value={promo.title}
            onChange={(e) => update('title', e.target.value)}
            placeholder='e.g. "Free delivery over $20"'
            className="rounded-xl"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-zinc-500 mb-1 block">Subtitle</label>
          <Input
            value={promo.subtitle}
            onChange={(e) => update('subtitle', e.target.value)}
            placeholder='e.g. "Today only — code FREE20"'
            className="rounded-xl"
          />
        </div>
        <div>
          <label className="text-xs text-zinc-500 mb-1 block">Button text</label>
          <Input
            value={promo.ctaText}
            onChange={(e) => update('ctaText', e.target.value)}
            placeholder='e.g. "Order now"'
            className="rounded-xl"
          />
        </div>
      </div>
    </div>
  );
}
