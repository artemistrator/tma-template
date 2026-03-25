'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useTelegramContext } from '@/lib/telegram/telegram-provider';
import { useAppConfig } from '@/context/app-config-context';
import { useTranslation } from '@/lib/use-translation';

interface LeadCaptureFormProps {
  id?: string;
  className?: string;
  props?: {
    title?: string;
    description?: string;
    source?: string;
    onSuccess?: string;
  };
  onNavigate?: (pageId: string) => void;
}

/**
 * LeadCaptureForm — name + email + phone form
 * Submits to POST /api/leads and notifies admin via Telegram.
 */
export function LeadCaptureForm({
  id,
  className,
  props,
  onNavigate,
}: LeadCaptureFormProps) {
  const { t } = useTranslation();

  const title = props?.title ?? t('leadForm.defaultTitle');
  const description = props?.description ?? t('leadForm.defaultDescription');
  const source = props?.source ?? 'lead-form';
  const onSuccessAction = props?.onSuccess;

  const { hapticFeedback, initData } = useTelegramContext();
  const { config } = useAppConfig();
  const tgUser = (initData as Record<string, unknown> | null)?.user as { first_name?: string; last_name?: string } | undefined;

  const [formData, setFormData] = React.useState({
    name: tgUser?.first_name ? `${tgUser.first_name}${tgUser.last_name ? ' ' + tgUser.last_name : ''}` : '',
    email: '',
    phone: '',
  });
  const [loading, setLoading] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);
  const [error, setError] = React.useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || formData.name.trim().length < 2) {
      setError(t('leadForm.validationError'));
      return;
    }

    hapticFeedback.impact('medium');
    setLoading(true);
    setError('');

    try {
      const tenantId = config?.meta?.slug || 'default';
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          name: formData.name.trim(),
          email: formData.email.trim() || null,
          phone: formData.phone.trim() || null,
          source,
        }),
      });
      const data = await res.json();
      if (data.success) {
        hapticFeedback.success();
        setSubmitted(true);
        if (onSuccessAction?.startsWith('navigate:')) {
          setTimeout(() => onNavigate?.(onSuccessAction.split(':')[1]), 1500);
        }
      } else {
        setError(data.error || 'Something went wrong');
        hapticFeedback.error();
      }
    } catch {
      setError(t('checkout.networkError'));
      hapticFeedback.error();
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div id={id} className={cn('p-6 flex flex-col items-center text-center gap-4', className)}>
        <div className="text-6xl">✅</div>
        <h2 className="text-xl font-bold">{t('leadForm.successTitle')}</h2>
        <p className="text-muted-foreground">{t('leadForm.successText')}</p>
        <Button variant="outline" onClick={() => onNavigate?.('home')}>{t('common.back')}</Button>
      </div>
    );
  }

  return (
    <div id={id} className={cn('p-4', className)}>
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('leadForm.name')} *</label>
              <Input
                placeholder={t('leadForm.namePlaceholder')}
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('leadForm.email')}</label>
              <Input
                type="email"
                placeholder={t('leadForm.emailPlaceholder')}
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('leadForm.phone')}</label>
              <Input
                type="tel"
                placeholder={t('leadForm.phonePlaceholder')}
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? t('leadForm.submitting') : t('leadForm.submit')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
