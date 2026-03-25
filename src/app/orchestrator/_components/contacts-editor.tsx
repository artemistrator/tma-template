'use client';

import React from 'react';
import { Input } from '@/components/ui/input';

export interface SocialLink {
  type: 'instagram' | 'vk' | 'youtube' | 'tiktok';
  url: string;
}

export interface ContactsData {
  phone?: string;
  telegram?: string;
  whatsapp?: string;
  address?: string;
  socials?: SocialLink[];
}

interface ContactsEditorProps {
  contacts: ContactsData;
  onChange: (contacts: ContactsData) => void;
}

const SOCIAL_TYPES = [
  { value: 'instagram' as const, label: 'Instagram', placeholder: 'https://instagram.com/...' },
  { value: 'vk' as const, label: 'VK', placeholder: 'https://vk.com/...' },
  { value: 'youtube' as const, label: 'YouTube', placeholder: 'https://youtube.com/...' },
  { value: 'tiktok' as const, label: 'TikTok', placeholder: 'https://tiktok.com/@...' },
];

export function ContactsEditor({ contacts, onChange }: ContactsEditorProps) {
  const socials = contacts.socials || [];

  function updateField(field: keyof ContactsData, value: string) {
    onChange({ ...contacts, [field]: value || undefined });
  }

  function addSocial() {
    const usedTypes = new Set(socials.map(s => s.type));
    const nextType = SOCIAL_TYPES.find(t => !usedTypes.has(t.value))?.value || 'instagram';
    onChange({ ...contacts, socials: [...socials, { type: nextType, url: '' }] });
  }

  function updateSocial(index: number, field: 'type' | 'url', value: string) {
    const updated = socials.map((s, i) =>
      i === index ? { ...s, [field]: value } : s
    );
    onChange({ ...contacts, socials: updated });
  }

  function removeSocial(index: number) {
    onChange({ ...contacts, socials: socials.filter((_, i) => i !== index) });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium mb-1.5 block">Phone</label>
          <Input
            value={contacts.phone || ''}
            onChange={(e) => updateField('phone', e.target.value)}
            placeholder="+7 (999) 123-45-67"
            className="rounded-2xl"
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 block">Telegram</label>
          <Input
            value={contacts.telegram || ''}
            onChange={(e) => updateField('telegram', e.target.value)}
            placeholder="@username or https://t.me/..."
            className="rounded-2xl"
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 block">WhatsApp</label>
          <Input
            value={contacts.whatsapp || ''}
            onChange={(e) => updateField('whatsapp', e.target.value)}
            placeholder="+79991234567"
            className="rounded-2xl"
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 block">Address</label>
          <Input
            value={contacts.address || ''}
            onChange={(e) => updateField('address', e.target.value)}
            placeholder="123 Main St, City"
            className="rounded-2xl"
          />
        </div>
      </div>

      {/* Socials */}
      <div>
        <label className="text-sm font-medium mb-2 block">Social links</label>
        {socials.length > 0 && (
          <div className="space-y-2 mb-3">
            {socials.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <select
                  value={s.type}
                  onChange={(e) => updateSocial(i, 'type', e.target.value)}
                  className="flex h-9 rounded-xl border border-zinc-200 bg-transparent px-2 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {SOCIAL_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                <Input
                  value={s.url}
                  onChange={(e) => updateSocial(i, 'url', e.target.value)}
                  placeholder={SOCIAL_TYPES.find(t => t.value === s.type)?.placeholder || 'URL'}
                  className="rounded-2xl flex-1"
                />
                <button
                  type="button"
                  onClick={() => removeSocial(i)}
                  className="p-2 text-zinc-400 hover:text-red-500 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
        {socials.length < SOCIAL_TYPES.length && (
          <button
            type="button"
            onClick={addSocial}
            className="rounded-2xl border border-dashed border-zinc-300 px-4 py-2 text-sm text-zinc-500 hover:border-zinc-400 hover:text-zinc-600 transition-colors"
          >
            + Add social link
          </button>
        )}
      </div>
    </div>
  );
}
