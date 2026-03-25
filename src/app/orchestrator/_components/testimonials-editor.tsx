'use client';

import { Input } from '@/components/ui/input';

export interface TestimonialData {
  name: string;
  role?: string;
  rating: number;
  text: string;
  source?: string;
}

const SOURCES = ['', 'Google', 'Yandex', 'Instagram', '2GIS', 'Telegram'] as const;

interface TestimonialsEditorProps {
  testimonials: TestimonialData[];
  onChange: (testimonials: TestimonialData[]) => void;
}

function StarInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          className="p-0.5 hover:scale-110 transition-transform"
        >
          <svg
            className={`w-5 h-5 ${star <= value ? 'text-amber-400' : 'text-zinc-200'}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        </button>
      ))}
    </div>
  );
}

export function TestimonialsEditor({ testimonials, onChange }: TestimonialsEditorProps) {
  const update = (index: number, patch: Partial<TestimonialData>) => {
    const next = [...testimonials];
    next[index] = { ...next[index], ...patch };
    onChange(next);
  };

  const add = () => {
    if (testimonials.length >= 10) return;
    onChange([...testimonials, { name: '', rating: 5, text: '' }]);
  };

  const remove = (index: number) => {
    onChange(testimonials.filter((_, i) => i !== index));
  };

  if (testimonials.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm text-xl">💬</div>
        <h3 className="mt-3 text-sm font-semibold">No testimonials yet</h3>
        <p className="mt-1 text-xs text-zinc-500">Add customer reviews to build trust. Leave empty for defaults.</p>
        <button type="button" onClick={add} className="mt-3 rounded-2xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white">
          Add testimonial
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {testimonials.map((t, i) => (
        <div key={i} className="rounded-2xl border border-zinc-200 bg-zinc-50/50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500">Review #{i + 1}</span>
            <button type="button" onClick={() => remove(i)} className="text-xs text-red-500 hover:text-red-600">
              Remove
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium">Name</label>
              <Input
                value={t.name}
                onChange={(e) => update(i, { name: e.target.value })}
                placeholder="Anna K."
                className="rounded-xl text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">Role (optional)</label>
              <Input
                value={t.role || ''}
                onChange={(e) => update(i, { role: e.target.value })}
                placeholder="Regular customer"
                className="rounded-xl text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">Source (optional)</label>
              <select
                value={t.source || ''}
                onChange={(e) => update(i, { source: e.target.value || undefined })}
                className="flex h-9 w-full rounded-xl border border-zinc-200 bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {SOURCES.map((s) => (
                  <option key={s} value={s}>{s || '— none —'}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-xs font-medium">Rating:</label>
            <StarInput value={t.rating} onChange={(r) => update(i, { rating: r })} />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium">Review text</label>
            <textarea
              value={t.text}
              onChange={(e) => update(i, { text: e.target.value })}
              placeholder="Best pizza in town! Fast delivery and great quality."
              rows={2}
              className="flex w-full rounded-xl border border-zinc-200 bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
            />
          </div>
        </div>
      ))}

      {testimonials.length < 10 && (
        <button
          type="button"
          onClick={add}
          className="w-full rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 py-3 text-sm text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 transition-colors"
        >
          + Add testimonial
        </button>
      )}
    </div>
  );
}
