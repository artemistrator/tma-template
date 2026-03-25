'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { useTelegramContext } from '@/lib/telegram/telegram-provider';
import { useCartItemCount, useCartStore } from '@/store/cart-store';
import { useAppConfig } from '@/context/app-config-context';
import { useTranslation } from '@/lib/use-translation';

const homeIcon = <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>;
const gridIcon = <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>;
const cartIcon = <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>;
const ordersIcon = <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
const chatIcon = <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>;
const heartIcon = <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>;
const libraryIcon = <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" /></svg>;

export function BottomNav({ currentPage, onNavigate, className }: { currentPage: string; onNavigate: (pageId: string) => void; className?: string }) {
  const cartItemCount = useCartItemCount();
  const favoritesCount = useCartStore((state) => state.favorites.length);
  const { hapticFeedback } = useTelegramContext();
  const { config } = useAppConfig();
  const { t } = useTranslation();

  const appType = config?.meta.appType;

  const navItems =
    appType === 'infobiz'
      ? [
          { id: 'home',         label: t('nav.home'),      icon: homeIcon },
          { id: 'catalog',      label: t('nav.products'),  icon: gridIcon },
          { id: 'my-purchases', label: t('nav.purchases'), icon: libraryIcon },
          { id: 'lead-form',    label: t('nav.contact'),   icon: chatIcon },
        ]
      : appType === 'booking'
      ? [
          { id: 'home',    label: t('nav.home'),     icon: homeIcon },
          { id: 'catalog', label: t('nav.services'), icon: gridIcon },
          { id: 'cart',    label: t('nav.cart'),     icon: cartIcon },
          { id: 'orders',  label: t('nav.bookings'), icon: ordersIcon },
        ]
      : [
          { id: 'home',      label: t('nav.home'),      icon: homeIcon },
          { id: 'catalog',   label: t('nav.catalog'),   icon: gridIcon },
          { id: 'favorites', label: t('nav.favorites'), icon: heartIcon },
          { id: 'cart',      label: t('nav.cart'),      icon: cartIcon },
          { id: 'orders',    label: t('nav.orders'),    icon: ordersIcon },
        ];

  const handleNavClick = (pageId: string) => { hapticFeedback.impact('light'); onNavigate(pageId); };

  return (
    <nav className={cn("fixed bottom-0 left-0 right-0 bg-background border-t safe-area-inset-bottom z-50", className)}>
      <div className="grid" style={{ gridTemplateColumns: `repeat(${navItems.length}, 1fr)` }}>
        {navItems.map((item) => {
          const isActive = currentPage === item.id;
          const showBadge = (item.id === 'cart' && cartItemCount > 0) || (item.id === 'favorites' && favoritesCount > 0);
          return (
            <button key={item.id} onClick={() => handleNavClick(item.id)} className={cn("flex flex-col items-center justify-center gap-1 relative h-16 transition-colors active:opacity-70", isActive ? "text-primary" : "text-muted-foreground")}>
              <div className="relative">{item.icon}{showBadge && <span className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">{item.id === 'favorites' ? (favoritesCount > 9 ? '9+' : favoritesCount) : (cartItemCount > 9 ? '9+' : cartItemCount)}</span>}</div>
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
