'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface SocialLink {
  type: 'instagram' | 'vk' | 'youtube' | 'tiktok';
  url: string;
}

interface ContactsBlockProps {
  id?: string;
  className?: string;
  onNavigate?: (pageId: string) => void;
  props?: {
    title?: string;
    phone?: string;
    telegram?: string;
    whatsapp?: string;
    address?: string;
    workingHoursSummary?: string;
    socials?: SocialLink[];
  };
}

const SOCIAL_META: Record<string, { label: string; icon: string }> = {
  instagram: { label: 'Instagram', icon: '📸' },
  vk: { label: 'VK', icon: '💬' },
  youtube: { label: 'YouTube', icon: '▶️' },
  tiktok: { label: 'TikTok', icon: '🎵' },
};

function ContactRow({ icon, label, href, children }: { icon: React.ReactNode; label: string; href?: string; children: React.ReactNode }) {
  const content = (
    <div className="flex items-center gap-3 p-3 rounded-xl border bg-card hover:bg-accent/50 transition-colors">
      <span className="text-xl flex-shrink-0 w-8 text-center">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium truncate">{children}</p>
      </div>
    </div>
  );

  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="block">
        {content}
      </a>
    );
  }
  return content;
}

export function ContactsBlock({ id, className, props = {} }: ContactsBlockProps) {
  const {
    title,
    phone,
    telegram,
    whatsapp,
    address,
    workingHoursSummary,
    socials = [],
  } = props;

  const hasContent = phone || telegram || whatsapp || address || workingHoursSummary || socials.length > 0;
  if (!hasContent) return null;

  return (
    <div id={id} className={cn('px-4 py-5 space-y-4', className)}>
      {title && <h2 className="text-xl font-bold">{title}</h2>}

      <div className="space-y-2">
        {phone && (
          <ContactRow icon="📞" label="Phone" href={`tel:${phone.replace(/[^\d+]/g, '')}`}>
            {phone}
          </ContactRow>
        )}

        {telegram && (
          <ContactRow
            icon="✈️"
            label="Telegram"
            href={telegram.startsWith('http') ? telegram : `https://t.me/${telegram.replace('@', '')}`}
          >
            {telegram.startsWith('@') ? telegram : `@${telegram}`}
          </ContactRow>
        )}

        {whatsapp && (
          <ContactRow
            icon="💬"
            label="WhatsApp"
            href={`https://wa.me/${whatsapp.replace(/[^\d]/g, '')}`}
          >
            {whatsapp}
          </ContactRow>
        )}

        {address && (
          <ContactRow icon="📍" label="Address">
            {address}
          </ContactRow>
        )}

        {workingHoursSummary && (
          <ContactRow icon="🕐" label="Working hours">
            {workingHoursSummary}
          </ContactRow>
        )}

        {socials.length > 0 && (
          <div className="flex gap-2 pt-1">
            {socials.map((s, i) => {
              const meta = SOCIAL_META[s.type] || { label: s.type, icon: '🔗' };
              return (
                <a
                  key={i}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border bg-card hover:bg-accent/50 transition-colors text-sm"
                >
                  <span>{meta.icon}</span>
                  <span>{meta.label}</span>
                </a>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
