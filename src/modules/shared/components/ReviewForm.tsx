'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { useAppConfig } from '@/context/app-config-context';

interface ReviewFormProps {
  className?: string;
  targetType?: 'business' | 'product' | 'service' | 'info_product';
  targetId?: string;
  onSubmitted?: () => void;
  onCancel?: () => void;
}

export function ReviewForm({ className, targetType = 'business', targetId, onSubmitted, onCancel }: ReviewFormProps) {
  const { tenantSlug } = useAppConfig();

  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');
  const [authorName, setAuthorName] = useState(() => {
    // Try to get name from Telegram WebApp
    try {
      const tg = (window as unknown as { Telegram?: { WebApp?: { initDataUnsafe?: { user?: { first_name?: string } } } } }).Telegram?.WebApp;
      return tg?.initDataUnsafe?.user?.first_name || '';
    } catch {
      return '';
    }
  });
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  function getTelegramUserId(): number | undefined {
    try {
      const tg = (window as unknown as { Telegram?: { WebApp?: { initDataUnsafe?: { user?: { id?: number } } } } }).Telegram?.WebApp;
      return tg?.initDataUnsafe?.user?.id;
    } catch {
      return undefined;
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === 0 || !text.trim() || !authorName.trim()) return;

    setStatus('sending');
    setErrorMessage('');

    try {
      // Haptic feedback
      try {
        const tg = (window as unknown as { Telegram?: { WebApp?: { HapticFeedback?: { impactOccurred: (s: string) => void } } } }).Telegram?.WebApp;
        tg?.HapticFeedback?.impactOccurred('light');
      } catch { /* ignore */ }

      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: tenantSlug,
          authorName: authorName.trim(),
          telegramUserId: getTelegramUserId(),
          rating,
          text: text.trim(),
          targetType,
          targetId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit review');
      }

      setStatus('success');
      // Haptic success
      try {
        const tg = (window as unknown as { Telegram?: { WebApp?: { HapticFeedback?: { notificationOccurred: (s: string) => void } } } }).Telegram?.WebApp;
        tg?.HapticFeedback?.notificationOccurred('success');
      } catch { /* ignore */ }

      // Don't auto-hide the success message — let the user see it
      // onSubmitted will be called when user taps "Done"
    } catch (error) {
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Something went wrong');
    }
  }

  if (status === 'success') {
    return (
      <div className={cn('p-4 rounded-xl border bg-card text-center space-y-3', className)}>
        <div className="text-3xl text-green-500">&#10003;</div>
        <p className="text-sm font-medium">Thank you for your review!</p>
        <p className="text-xs text-muted-foreground">It will appear after moderation</p>
        <button
          type="button"
          onClick={() => onSubmitted?.()}
          className="mt-1 px-4 py-2 text-xs font-medium rounded-lg bg-primary text-primary-foreground"
        >
          Done
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={cn('p-4 rounded-xl border bg-card space-y-3', className)}>
      {/* Star rating */}
      <div>
        <p className="text-sm font-medium mb-2">Your rating</p>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => {
                setRating(star);
                try {
                  const tg = (window as unknown as { Telegram?: { WebApp?: { HapticFeedback?: { selectionChanged: () => void } } } }).Telegram?.WebApp;
                  tg?.HapticFeedback?.selectionChanged();
                } catch { /* ignore */ }
              }}
              className="p-0.5 transition-transform active:scale-110 cursor-pointer"
            >
              <svg
                className={cn('w-4 h-4', star <= rating ? 'text-amber-400' : 'text-gray-400')}
                fill={star <= rating ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth={star <= rating ? 0 : 1.5}
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </button>
          ))}
        </div>
      </div>

      {/* Name */}
      <input
        type="text"
        value={authorName}
        onChange={(e) => setAuthorName(e.target.value)}
        placeholder="Your name"
        maxLength={255}
        required
        className="w-full px-3 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
      />

      {/* Text */}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Share your experience..."
        maxLength={1000}
        rows={3}
        required
        className="w-full px-3 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
      />
      <p className="text-[10px] text-muted-foreground text-right">{text.length}/1000</p>

      {/* Error */}
      {status === 'error' && (
        <p className="text-xs text-red-500">{errorMessage}</p>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={rating === 0 || !text.trim() || !authorName.trim() || status === 'sending'}
          className="flex-1 py-2.5 text-sm font-medium rounded-lg bg-primary text-primary-foreground disabled:opacity-50 transition-opacity"
        >
          {status === 'sending' ? 'Sending...' : 'Submit review'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground rounded-lg border transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
