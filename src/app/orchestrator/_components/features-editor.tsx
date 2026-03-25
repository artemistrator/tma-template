'use client';

import { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export interface FeatureItem {
  icon: string;
  title: string;
  description: string;
}

interface FeaturesEditorProps {
  features: FeatureItem[];
  onChange: (features: FeatureItem[]) => void;
}

const EMOJI_SUGGESTIONS = ['🚀', '⭐', '💎', '🔥', '💳', '📦', '🎯', '👨‍🍳', '🔔', '❤️', '🛡️', '⚡'];

export function FeaturesEditor({ features, onChange }: FeaturesEditorProps) {
  const add = useCallback(() => {
    onChange([...features, { icon: '⭐', title: '', description: '' }]);
  }, [features, onChange]);

  const remove = useCallback(
    (index: number) => {
      onChange(features.filter((_, i) => i !== index));
    },
    [features, onChange],
  );

  const update = useCallback(
    (index: number, field: keyof FeatureItem, value: string) => {
      const updated = [...features];
      updated[index] = { ...updated[index], [field]: value };
      onChange(updated);
    },
    [features, onChange],
  );

  return (
    <div className="space-y-3">
      {features.map((feature, i) => (
        <div key={i} className="flex gap-3 items-start rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
          <div className="shrink-0">
            <label className="text-xs text-zinc-500 mb-1 block">Icon</label>
            <div className="relative">
              <Input
                value={feature.icon}
                onChange={(e) => update(i, 'icon', e.target.value)}
                className="w-14 text-center text-lg h-10 rounded-xl"
                maxLength={4}
              />
            </div>
            <div className="flex flex-wrap gap-1 mt-1.5 max-w-[56px]">
              {EMOJI_SUGGESTIONS.slice(0, 4).map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => update(i, 'icon', emoji)}
                  className="text-xs hover:scale-125 transition-transform"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 space-y-2">
            <Input
              value={feature.title}
              onChange={(e) => update(i, 'title', e.target.value)}
              placeholder="Title, e.g. Fast delivery"
              className="rounded-xl"
            />
            <Input
              value={feature.description}
              onChange={(e) => update(i, 'description', e.target.value)}
              placeholder="Short description"
              className="rounded-xl"
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => remove(i)}
            className="text-zinc-400 hover:text-red-500 shrink-0 mt-5"
          >
            &times;
          </Button>
        </div>
      ))}
      {features.length < 8 && (
        <Button type="button" variant="outline" onClick={add} className="rounded-2xl">
          + Add feature
        </Button>
      )}
    </div>
  );
}
