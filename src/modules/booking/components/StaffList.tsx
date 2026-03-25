'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { useTelegramContext } from '@/lib/telegram/telegram-provider';

interface StaffMember {
  id: string;
  name: string;
  role?: string;
  bio?: string;
  photo?: string;
  ctaText?: string;
  ctaPage?: string;
}

interface StaffListProps {
  id?: string;
  className?: string;
  onNavigate?: (pageId: string) => void;
  props?: {
    title?: string;
    subtitle?: string;
    layout?: 'cards' | 'compact'; // default "cards"
    items?: StaffMember[];
  };
}

function StaffAvatar({ name, src }: { name: string; src?: string }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={name} className="w-16 h-16 rounded-full object-cover flex-shrink-0" />;
  }
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
  return (
    <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xl font-bold flex-shrink-0">
      {initials}
    </div>
  );
}

/**
 * StaffList — team members / specialists block.
 *
 * Config example:
 * {
 *   title: "Our specialists",
 *   items: [
 *     { id: "1", name: "Anna K.", role: "Hair stylist", bio: "10 years exp, specializes in color", ctaText: "Book", ctaPage: "catalog" },
 *     { id: "2", name: "Mike R.", role: "Barber", ctaText: "Book", ctaPage: "catalog" }
 *   ]
 * }
 */
export function StaffList({ id, className, onNavigate, props = {} }: StaffListProps) {
  const { title, subtitle, layout = 'cards', items = [] } = props;
  const { hapticFeedback } = useTelegramContext();

  if (items.length === 0) return null;

  const handleCta = (member: StaffMember) => {
    hapticFeedback.impact('light');
    const target = member.ctaPage || 'catalog';
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('booking_preselect_staff', member.id);
    }
    onNavigate?.(target);
  };

  if (layout === 'compact') {
    return (
      <div id={id} className={cn('px-4 py-5 space-y-3', className)}>
        {title && <h2 className="text-xl font-bold">{title}</h2>}
        {subtitle && <p className="text-sm text-muted-foreground -mt-2">{subtitle}</p>}
        {items.map((member) => (
          <div key={member.id} className="flex items-center gap-3 p-3 rounded-xl border bg-card">
            <StaffAvatar name={member.name} src={member.photo} />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm leading-tight">{member.name}</p>
              {member.role && <p className="text-xs text-muted-foreground">{member.role}</p>}
            </div>
            {member.ctaText && (
              <button
                onClick={() => handleCta(member)}
                className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors active:scale-95"
              >
                {member.ctaText}
              </button>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div id={id} className={cn('px-4 py-5 space-y-4', className)}>
      {title && <h2 className="text-xl font-bold">{title}</h2>}
      {subtitle && <p className="text-sm text-muted-foreground -mt-2">{subtitle}</p>}
      <div className="space-y-3">
        {items.map((member) => (
          <div key={member.id} className="p-4 rounded-xl border bg-card space-y-3">
            <div className="flex items-start gap-4">
              <StaffAvatar name={member.name} src={member.photo} />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-base leading-tight">{member.name}</p>
                {member.role && <p className="text-sm text-primary font-medium">{member.role}</p>}
                {member.bio && (
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{member.bio}</p>
                )}
              </div>
            </div>
            {member.ctaText && (
              <button
                onClick={() => handleCta(member)}
                className="w-full py-2 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors active:scale-95"
              >
                {member.ctaText}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
