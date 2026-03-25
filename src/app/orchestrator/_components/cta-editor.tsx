'use client';

import { Input } from '@/components/ui/input';

export interface CtaData {
  text?: string;
  sticky?: boolean;
  page?: string;
  secondaryText?: string;
  secondaryAction?: string;
}

const PAGE_OPTIONS = [
  { value: 'catalog', label: 'Catalog' },
  { value: 'cart', label: 'Cart' },
  { value: 'checkout', label: 'Checkout' },
  { value: 'lead-form', label: 'Lead form' },
] as const;

interface CtaEditorProps {
  cta: CtaData;
  onChange: (cta: CtaData) => void;
}

export function CtaEditor({ cta, onChange }: CtaEditorProps) {
  const update = (patch: Partial<CtaData>) => onChange({ ...cta, ...patch });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium">Button text</label>
          <Input
            value={cta.text || ''}
            onChange={(e) => update({ text: e.target.value })}
            placeholder="e.g. Order now"
            className="rounded-2xl"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Navigate to</label>
          <select
            value={cta.page || 'catalog'}
            onChange={(e) => update({ page: e.target.value })}
            className="flex h-9 w-full rounded-xl border border-zinc-200 bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {PAGE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={cta.sticky ?? true}
          onChange={(e) => update({ sticky: e.target.checked })}
          className="h-4 w-4 rounded border-zinc-300"
        />
        <span className="text-sm">Sticky — fixed at the bottom of the screen</span>
      </label>

      <div className="border-t border-zinc-200 pt-4">
        <p className="text-sm font-medium mb-3">Secondary button (optional)</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Text</label>
            <Input
              value={cta.secondaryText || ''}
              onChange={(e) => update({ secondaryText: e.target.value })}
              placeholder="e.g. Call us"
              className="rounded-2xl"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Action</label>
            <Input
              value={cta.secondaryAction || ''}
              onChange={(e) => update({ secondaryAction: e.target.value })}
              placeholder="tel:+79991234567 or page id"
              className="rounded-2xl"
            />
            <p className="text-xs text-zinc-500 mt-1">tel:, https://, or page id (e.g. cart)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
