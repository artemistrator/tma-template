'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export type StyleTone = 'premium' | 'friendly' | 'bold' | 'minimal';
export type StyleDensity = 'airy' | 'balanced' | 'compact';
export type StyleVisual = 'soft' | 'sharp' | 'layered';

export interface StylePreset {
  tone: StyleTone;
  density: StyleDensity;
  visual: StyleVisual;
}

interface StylePresetSelectorProps {
  value: StylePreset;
  onChange: (value: StylePreset) => void;
}

const TONES: { id: StyleTone; label: string; desc: string; preview: React.CSSProperties }[] = [
  {
    id: 'premium',
    label: 'Premium',
    desc: 'Elegant, light weight',
    preview: { fontWeight: 300, letterSpacing: '0.02em', borderRadius: 16 },
  },
  {
    id: 'friendly',
    label: 'Friendly',
    desc: 'Warm, approachable',
    preview: { fontWeight: 500, letterSpacing: '0', borderRadius: 12 },
  },
  {
    id: 'bold',
    label: 'Bold',
    desc: 'Strong, impactful',
    preview: { fontWeight: 800, letterSpacing: '-0.01em', borderRadius: 4 },
  },
  {
    id: 'minimal',
    label: 'Minimal',
    desc: 'Clean, understated',
    preview: { fontWeight: 400, letterSpacing: '0', borderRadius: 2 },
  },
];

const DENSITIES: { id: StyleDensity; label: string; desc: string; gap: number }[] = [
  { id: 'airy', label: 'Airy', desc: 'Spacious layout', gap: 24 },
  { id: 'balanced', label: 'Balanced', desc: 'Standard spacing', gap: 16 },
  { id: 'compact', label: 'Compact', desc: 'Dense layout', gap: 8 },
];

const VISUALS: { id: StyleVisual; label: string; desc: string }[] = [
  { id: 'soft', label: 'Soft', desc: 'Rounded, shadows' },
  { id: 'sharp', label: 'Sharp', desc: 'Straight, contrast' },
  { id: 'layered', label: 'Layered', desc: 'Depth, overlays' },
];

function TonePreview({ tone, active }: { tone: typeof TONES[number]; active: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1.5 w-full">
      {/* Mini preview card */}
      <div
        className={cn(
          'w-full aspect-[4/3] border-2 transition-all flex flex-col items-center justify-center p-2',
          active ? 'border-zinc-900 bg-zinc-50' : 'border-zinc-200 bg-white hover:border-zinc-300',
        )}
        style={{ borderRadius: tone.preview.borderRadius }}
      >
        <div
          className="h-1.5 w-10 bg-zinc-900 mb-1.5"
          style={{ borderRadius: tone.preview.borderRadius / 4 }}
        />
        <div
          className="text-[10px] text-zinc-600"
          style={{
            fontWeight: tone.preview.fontWeight,
            letterSpacing: tone.preview.letterSpacing,
          }}
        >
          {tone.label}
        </div>
        <div className="flex gap-1 mt-1.5">
          <div className="h-1 w-6 bg-zinc-300 rounded-full" />
          <div className="h-1 w-4 bg-zinc-200 rounded-full" />
        </div>
      </div>
      <span className="text-xs font-medium">{tone.label}</span>
      <span className="text-[10px] text-zinc-500 leading-tight">{tone.desc}</span>
    </div>
  );
}

function DensityPreview({ density, active }: { density: typeof DENSITIES[number]; active: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1.5 w-full">
      <div
        className={cn(
          'w-full aspect-[4/3] rounded-xl border-2 transition-all flex flex-col items-center justify-center',
          active ? 'border-zinc-900 bg-zinc-50' : 'border-zinc-200 bg-white hover:border-zinc-300',
        )}
      >
        {/* Lines with varying gaps */}
        <div className="flex flex-col items-center" style={{ gap: density.gap / 4 }}>
          <div className="h-1.5 w-12 bg-zinc-400 rounded-full" />
          <div className="h-1.5 w-10 bg-zinc-300 rounded-full" />
          <div className="h-1.5 w-8 bg-zinc-200 rounded-full" />
        </div>
      </div>
      <span className="text-xs font-medium">{density.label}</span>
      <span className="text-[10px] text-zinc-500 leading-tight">{density.desc}</span>
    </div>
  );
}

function VisualPreview({ visual, active }: { visual: typeof VISUALS[number]; active: boolean }) {
  const isSoft = visual.id === 'soft';
  const isSharp = visual.id === 'sharp';
  const isLayered = visual.id === 'layered';

  return (
    <div className="flex flex-col items-center gap-1.5 w-full">
      <div
        className={cn(
          'w-full aspect-[4/3] border-2 transition-all flex items-center justify-center overflow-hidden',
          active ? 'border-zinc-900 bg-zinc-50' : 'border-zinc-200 bg-white hover:border-zinc-300',
          isSoft && 'rounded-2xl',
          isSharp && 'rounded-none',
          isLayered && 'rounded-xl',
        )}
      >
        {isSoft && (
          <div className="w-10 h-6 rounded-xl bg-zinc-200 shadow-md" />
        )}
        {isSharp && (
          <div className="w-10 h-6 bg-zinc-800 border border-zinc-900" />
        )}
        {isLayered && (
          <div className="relative w-12 h-8">
            <div className="absolute inset-0 bg-zinc-300 rounded-lg translate-x-1 translate-y-1" />
            <div className="absolute inset-0 bg-zinc-200 rounded-lg translate-x-0.5 translate-y-0.5" />
            <div className="absolute inset-0 bg-white rounded-lg border border-zinc-200 shadow-sm" />
          </div>
        )}
      </div>
      <span className="text-xs font-medium">{visual.label}</span>
      <span className="text-[10px] text-zinc-500 leading-tight">{visual.desc}</span>
    </div>
  );
}

export function StylePresetSelector({ value, onChange }: StylePresetSelectorProps) {
  return (
    <div className="space-y-5">
      {/* Tone */}
      <div>
        <label className="text-sm font-medium mb-2.5 block">Tone</label>
        <div className="grid grid-cols-4 gap-3">
          {TONES.map((tone) => (
            <button
              key={tone.id}
              type="button"
              onClick={() => onChange({ ...value, tone: tone.id })}
              className="text-center focus:outline-none"
            >
              <TonePreview tone={tone} active={value.tone === tone.id} />
            </button>
          ))}
        </div>
      </div>

      {/* Density */}
      <div>
        <label className="text-sm font-medium mb-2.5 block">Density</label>
        <div className="grid grid-cols-3 gap-3">
          {DENSITIES.map((density) => (
            <button
              key={density.id}
              type="button"
              onClick={() => onChange({ ...value, density: density.id })}
              className="text-center focus:outline-none"
            >
              <DensityPreview density={density} active={value.density === density.id} />
            </button>
          ))}
        </div>
      </div>

      {/* Visual */}
      <div>
        <label className="text-sm font-medium mb-2.5 block">Visual style</label>
        <div className="grid grid-cols-3 gap-3">
          {VISUALS.map((visual) => (
            <button
              key={visual.id}
              type="button"
              onClick={() => onChange({ ...value, visual: visual.id })}
              className="text-center focus:outline-none"
            >
              <VisualPreview visual={visual} active={value.visual === visual.id} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
