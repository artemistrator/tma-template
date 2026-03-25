'use client';

import { useState, useEffect } from 'react';
import { useAdmin, useAdminFetch } from '@/lib/admin/admin-context';
import { PageHeader } from '@/components/admin/page-header';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/admin/toast';

type PaymentMethod = 'yookassa' | 'stars' | 'cash';
type DeliveryMethodType = 'pickup' | 'courier' | 'cdek';

interface TenantSettings {
  id: string | number;
  name: string;
  slug: string;
  config: {
    businessType?: string;
    currency?: string;
    locale?: string;
    phone?: string;
    address?: string;
    theme?: { primaryColor?: string; secondaryColor?: string };
    payments?: {
      yookassa?: { shopId: string; secretKey: string; testMode: boolean };
      methods?: PaymentMethod[];
    };
    delivery?: {
      methods?: DeliveryMethodType[];
      courier?: { price: number; freeFrom?: number; estimatedDays?: string; zone?: string };
      cdek?: { clientId: string; clientSecret: string; testMode: boolean; senderCityCode?: string };
    };
    features?: {
      reviews?: {
        enabled?: boolean;
        businessReviews?: boolean;
        productReviews?: boolean;
        allowSubmission?: boolean;
        moderation?: boolean;
      };
      assistant?: {
        enabled?: boolean;
        mode?: string;
        botUsername?: string;
        entryCta?: string;
        placement?: 'floating' | 'header' | 'contacts' | 'product_page';
      };
    };
  };
}

const inputClass = "w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 disabled:opacity-50 focus:outline-none focus:ring-1 focus:ring-primary/40";
const checkboxClass = "mt-0.5 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/30 disabled:opacity-50";
const TABS = ['General', 'Payments', 'Delivery', 'Features'] as const;
type Tab = typeof TABS[number];

// ─── General Tab ──────────────────────────────────────────────────────────────

function GeneralTab({ tenant, isOwner }: { tenant: TenantSettings; isOwner: boolean }) {
  const adminFetch = useAdminFetch();
  const { showToast } = useToast();
  const [name, setName] = useState(tenant.name || '');
  const [phone, setPhone] = useState(tenant.config?.phone || '');
  const [address, setAddress] = useState(tenant.config?.address || '');
  const [primaryColor, setPrimaryColor] = useState(tenant.config?.theme?.primaryColor || '');
  const [secondaryColor, setSecondaryColor] = useState(tenant.config?.theme?.secondaryColor || '');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    const data = await adminFetch('/settings', {
      method: 'PATCH',
      body: JSON.stringify({
        name: name.trim(),
        config: {
          phone: phone.trim() || undefined,
          address: address.trim() || undefined,
          theme: {
            primaryColor: primaryColor.trim() || undefined,
            secondaryColor: secondaryColor.trim() || undefined,
          },
        },
      }),
    });
    setSaving(false);
    if (data.success) showToast('Saved', 'success');
    else showToast('Failed to save', 'error');
  }

  return (
    <div className="space-y-6">
      {/* Business Info */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 space-y-4">
        <h2 className="text-sm font-medium">Business Info</h2>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Business Name</label>
          <input value={name} onChange={e => setName(e.target.value)} disabled={!isOwner} className={inputClass} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Phone</label>
            <input value={phone} onChange={e => setPhone(e.target.value)} disabled={!isOwner} placeholder="+7 999 123-45-67" className={inputClass} />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Address</label>
            <input value={address} onChange={e => setAddress(e.target.value)} disabled={!isOwner} className={inputClass} />
          </div>
        </div>
      </div>

      {/* Theme */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 space-y-4">
        <h2 className="text-sm font-medium">Theme</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Primary Color</label>
            <div className="flex gap-2">
              <input type="color" value={primaryColor || '#3B82F6'} onChange={e => setPrimaryColor(e.target.value)} disabled={!isOwner}
                className="h-9 w-12 rounded border border-gray-200 dark:border-gray-700 cursor-pointer disabled:opacity-50" />
              <input value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} disabled={!isOwner} placeholder="#3B82F6"
                className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 font-mono disabled:opacity-50 focus:outline-none focus:ring-1 focus:ring-primary/40" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Secondary Color</label>
            <div className="flex gap-2">
              <input type="color" value={secondaryColor || '#1E40AF'} onChange={e => setSecondaryColor(e.target.value)} disabled={!isOwner}
                className="h-9 w-12 rounded border border-gray-200 dark:border-gray-700 cursor-pointer disabled:opacity-50" />
              <input value={secondaryColor} onChange={e => setSecondaryColor(e.target.value)} disabled={!isOwner} placeholder="#1E40AF"
                className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 font-mono disabled:opacity-50 focus:outline-none focus:ring-1 focus:ring-primary/40" />
            </div>
          </div>
        </div>
      </div>

      {/* Read-only info */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 space-y-1">
        <h2 className="text-sm font-medium mb-2">Info</h2>
        {[
          ['Slug', <span className="font-mono">{tenant.slug}</span>],
          ['Business Type', <span className="capitalize">{tenant.config.businessType || 'N/A'}</span>],
          ['Currency', tenant.config.currency || 'USD'],
          ['Locale', tenant.config.locale || 'en'],
        ].map(([label, value]) => (
          <div key={String(label)} className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-800 last:border-0">
            <span className="text-xs text-muted-foreground">{label}</span>
            <span className="text-xs">{value}</span>
          </div>
        ))}
      </div>

      {isOwner && <Button onClick={handleSave} loading={saving} size="sm">Save Changes</Button>}
    </div>
  );
}

// ─── Payments Tab ─────────────────────────────────────────────────────────────

function PaymentsTab({ tenant, isOwner }: { tenant: TenantSettings; isOwner: boolean }) {
  const adminFetch = useAdminFetch();
  const { showToast } = useToast();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>(tenant.config?.payments?.methods || []);
  const [yookassaShopId, setYookassaShopId] = useState(tenant.config?.payments?.yookassa?.shopId || '');
  const [yookassaSecretKey, setYookassaSecretKey] = useState(tenant.config?.payments?.yookassa?.secretKey || '');
  const [yookassaTestMode, setYookassaTestMode] = useState(tenant.config?.payments?.yookassa?.testMode ?? true);
  const [saving, setSaving] = useState(false);

  function toggleMethod(method: PaymentMethod) {
    setPaymentMethods(prev => prev.includes(method) ? prev.filter(m => m !== method) : [...prev, method]);
  }

  async function handleSave() {
    setSaving(true);
    const paymentsUpdate: Record<string, unknown> = { methods: paymentMethods };
    if (paymentMethods.includes('yookassa')) {
      paymentsUpdate.yookassa = { shopId: yookassaShopId.trim(), secretKey: yookassaSecretKey.trim(), testMode: yookassaTestMode };
    }
    const data = await adminFetch('/settings', {
      method: 'PATCH',
      body: JSON.stringify({ config: { payments: paymentsUpdate } }),
    });
    setSaving(false);
    if (data.success) showToast('Saved', 'success');
    else showToast('Failed to save', 'error');
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 space-y-4">
        <div>
          <h2 className="text-sm font-medium">Payment Methods</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Select which payment methods customers can use</p>
        </div>

        <div className="space-y-3">
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={paymentMethods.includes('yookassa')} onChange={() => toggleMethod('yookassa')} disabled={!isOwner} className={checkboxClass} />
            <div>
              <span className="text-sm font-medium">YooKassa (Bank Cards)</span>
              <p className="text-xs text-muted-foreground">Visa, Mastercard, MIR via YooKassa</p>
            </div>
          </label>

          {paymentMethods.includes('yookassa') && isOwner && (
            <div className="ml-7 space-y-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Shop ID</label>
                <input value={yookassaShopId} onChange={e => setYookassaShopId(e.target.value)} placeholder="123456" className={inputClass + ' font-mono'} />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Secret Key</label>
                <input type="password" value={yookassaSecretKey} onChange={e => setYookassaSecretKey(e.target.value)} placeholder="test_..." className={inputClass + ' font-mono'} />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={yookassaTestMode} onChange={e => setYookassaTestMode(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/30" />
                <span className="text-xs text-muted-foreground">Test mode (no real charges)</span>
              </label>
              {(!yookassaShopId || !yookassaSecretKey) && (
                <p className="text-xs text-warning-foreground">Without credentials, YooKassa will work in test mode (simulated payments)</p>
              )}
            </div>
          )}

          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={paymentMethods.includes('stars')} onChange={() => toggleMethod('stars')} disabled={!isOwner} className={checkboxClass} />
            <div>
              <span className="text-sm font-medium">Telegram Stars</span>
              <p className="text-xs text-muted-foreground">In-app payments via Telegram Stars</p>
            </div>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={paymentMethods.includes('cash')} onChange={() => toggleMethod('cash')} disabled={!isOwner} className={checkboxClass} />
            <div>
              <span className="text-sm font-medium">Cash on Delivery</span>
              <p className="text-xs text-muted-foreground">Customer pays when they receive the order</p>
            </div>
          </label>
        </div>

        {paymentMethods.length === 0 && (
          <p className="text-xs text-muted-foreground">No payment methods selected. Default checkout will be used.</p>
        )}
      </div>

      {isOwner && <Button onClick={handleSave} loading={saving} size="sm">Save Changes</Button>}
    </div>
  );
}

// ─── Delivery Tab ─────────────────────────────────────────────────────────────

function DeliveryTab({ tenant, isOwner }: { tenant: TenantSettings; isOwner: boolean }) {
  const adminFetch = useAdminFetch();
  const { showToast } = useToast();
  const [deliveryMethods, setDeliveryMethods] = useState<DeliveryMethodType[]>(tenant.config?.delivery?.methods || []);
  const [courierPrice, setCourierPrice] = useState(String(tenant.config?.delivery?.courier?.price ?? ''));
  const [courierFreeFrom, setCourierFreeFrom] = useState(String(tenant.config?.delivery?.courier?.freeFrom ?? ''));
  const [courierEstimatedDays, setCourierEstimatedDays] = useState(tenant.config?.delivery?.courier?.estimatedDays || '');
  const [courierZone, setCourierZone] = useState(tenant.config?.delivery?.courier?.zone || '');
  const [cdekClientId, setCdekClientId] = useState(tenant.config?.delivery?.cdek?.clientId || '');
  const [cdekClientSecret, setCdekClientSecret] = useState(tenant.config?.delivery?.cdek?.clientSecret || '');
  const [cdekTestMode, setCdekTestMode] = useState(tenant.config?.delivery?.cdek?.testMode ?? true);
  const [cdekSenderCityCode, setCdekSenderCityCode] = useState(tenant.config?.delivery?.cdek?.senderCityCode || '');
  const [saving, setSaving] = useState(false);

  function toggleMethod(method: DeliveryMethodType) {
    setDeliveryMethods(prev => prev.includes(method) ? prev.filter(m => m !== method) : [...prev, method]);
  }

  async function handleSave() {
    setSaving(true);
    const deliveryUpdate: Record<string, unknown> = { methods: deliveryMethods };
    if (deliveryMethods.includes('courier')) {
      deliveryUpdate.courier = {
        price: Number(courierPrice) || 0,
        freeFrom: Number(courierFreeFrom) || undefined,
        estimatedDays: courierEstimatedDays.trim() || undefined,
        zone: courierZone.trim() || undefined,
      };
    }
    if (deliveryMethods.includes('cdek')) {
      deliveryUpdate.cdek = {
        clientId: cdekClientId.trim(),
        clientSecret: cdekClientSecret.trim(),
        testMode: cdekTestMode,
        senderCityCode: cdekSenderCityCode.trim() || undefined,
      };
    }
    const data = await adminFetch('/settings', {
      method: 'PATCH',
      body: JSON.stringify({ config: { delivery: deliveryUpdate } }),
    });
    setSaving(false);
    if (data.success) showToast('Saved', 'success');
    else showToast('Failed to save', 'error');
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 space-y-4">
        <div>
          <h2 className="text-sm font-medium">Delivery Methods</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Configure how customers receive their orders</p>
        </div>

        <div className="space-y-3">
          {/* Pickup */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={deliveryMethods.includes('pickup')} onChange={() => toggleMethod('pickup')} disabled={!isOwner} className={checkboxClass} />
            <div>
              <span className="text-sm font-medium">Self Pickup</span>
              <p className="text-xs text-muted-foreground">Customers collect orders from your pickup points</p>
            </div>
          </label>
          {deliveryMethods.includes('pickup') && (
            <p className="ml-7 text-xs text-muted-foreground">
              Manage pickup points on the <a href={`/admin/${tenant.slug}/delivery`} className="text-primary hover:underline">Delivery page</a>
            </p>
          )}

          {/* Courier */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={deliveryMethods.includes('courier')} onChange={() => toggleMethod('courier')} disabled={!isOwner} className={checkboxClass} />
            <div>
              <span className="text-sm font-medium">Courier Delivery</span>
              <p className="text-xs text-muted-foreground">Manual delivery by your own courier</p>
            </div>
          </label>
          {deliveryMethods.includes('courier') && isOwner && (
            <div className="ml-7 space-y-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Delivery Price</label>
                  <input type="number" value={courierPrice} onChange={e => setCourierPrice(e.target.value)} placeholder="300" className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Free Delivery From</label>
                  <input type="number" value={courierFreeFrom} onChange={e => setCourierFreeFrom(e.target.value)} placeholder="3000" className={inputClass} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Estimated Time</label>
                  <input value={courierEstimatedDays} onChange={e => setCourierEstimatedDays(e.target.value)} placeholder="1-2 days" className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Delivery Zone</label>
                  <input value={courierZone} onChange={e => setCourierZone(e.target.value)} placeholder="Moscow" className={inputClass} />
                </div>
              </div>
            </div>
          )}

          {/* CDEK */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={deliveryMethods.includes('cdek')} onChange={() => toggleMethod('cdek')} disabled={!isOwner} className={checkboxClass} />
            <div>
              <span className="text-sm font-medium">CDEK</span>
              <p className="text-xs text-muted-foreground">Russian delivery service with automated tariff calculation</p>
            </div>
          </label>
          {deliveryMethods.includes('cdek') && isOwner && (
            <div className="ml-7 space-y-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Client ID</label>
                  <input value={cdekClientId} onChange={e => setCdekClientId(e.target.value)} placeholder="EMscd6r9JnFiQ3bLoyjJY6eM78JrJceI" className={inputClass + ' font-mono'} />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Client Secret</label>
                  <input type="password" value={cdekClientSecret} onChange={e => setCdekClientSecret(e.target.value)} placeholder="PjLZkKBHEiLK3YsjtNrt3TGNG0ahs3dG" className={inputClass + ' font-mono'} />
                </div>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Sender City Code</label>
                <input value={cdekSenderCityCode} onChange={e => setCdekSenderCityCode(e.target.value)} placeholder="44 (Moscow)" className={inputClass + ' font-mono'} />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={cdekTestMode} onChange={e => setCdekTestMode(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/30" />
                <span className="text-xs text-muted-foreground">Test mode (uses CDEK test API)</span>
              </label>
              {(!cdekClientId || !cdekClientSecret) && (
                <p className="text-xs text-warning-foreground">Without credentials, CDEK will use official test account</p>
              )}
            </div>
          )}
        </div>

        {deliveryMethods.length === 0 && (
          <p className="text-xs text-muted-foreground">No delivery methods selected. Customers will only see the shipping address form.</p>
        )}
      </div>

      {isOwner && <Button onClick={handleSave} loading={saving} size="sm">Save Changes</Button>}
    </div>
  );
}

// ─── Features Tab ─────────────────────────────────────────────────────────────

function FeaturesTab({ tenant, isOwner }: { tenant: TenantSettings; isOwner: boolean }) {
  const adminFetch = useAdminFetch();
  const { showToast } = useToast();
  const reviewsCfg = tenant.config?.features?.reviews;
  const assistantCfg = tenant.config?.features?.assistant;

  const [reviewsEnabled, setReviewsEnabled] = useState(!!reviewsCfg?.enabled);
  const [businessReviews, setBusinessReviews] = useState(reviewsCfg?.businessReviews ?? true);
  const [productReviews, setProductReviews] = useState(reviewsCfg?.productReviews ?? true);
  const [allowSubmission, setAllowSubmission] = useState(reviewsCfg?.allowSubmission ?? true);
  const [reviewsModeration, setReviewsModeration] = useState(reviewsCfg?.moderation ?? true);

  const [assistantEnabled, setAssistantEnabled] = useState(!!assistantCfg?.enabled);
  const [assistantBotUsername, setAssistantBotUsername] = useState(assistantCfg?.botUsername || '');
  const [assistantEntryCta, setAssistantEntryCta] = useState(assistantCfg?.entryCta || '');
  const [assistantPlacement, setAssistantPlacement] = useState<'floating' | 'header' | 'contacts' | 'product_page'>(assistantCfg?.placement || 'floating');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    const data = await adminFetch('/settings', {
      method: 'PATCH',
      body: JSON.stringify({
        config: {
          features: {
            reviews: { enabled: reviewsEnabled, businessReviews, productReviews, allowSubmission, moderation: reviewsModeration },
            assistant: {
              enabled: assistantEnabled,
              mode: 'telegram_bot',
              botUsername: assistantBotUsername.trim().replace(/^@/, '') || undefined,
              entryCta: assistantEntryCta.trim() || undefined,
              placement: assistantPlacement,
            },
          },
        },
      }),
    });
    setSaving(false);
    if (data.success) showToast('Saved', 'success');
    else showToast('Failed to save', 'error');
  }

  return (
    <div className="space-y-6">
      {/* Reviews */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 space-y-4">
        <div>
          <h2 className="text-sm font-medium">User Reviews</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Allow customers to leave reviews on your mini app</p>
        </div>
        <div className="space-y-3">
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={reviewsEnabled} onChange={e => setReviewsEnabled(e.target.checked)} disabled={!isOwner} className={checkboxClass} />
            <div>
              <span className="text-sm font-medium">Enable Reviews</span>
              <p className="text-xs text-muted-foreground">Show reviews section in your mini app</p>
            </div>
          </label>
          {reviewsEnabled && (
            <div className="ml-7 space-y-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              {[
                [businessReviews, setBusinessReviews, 'Business reviews', 'General reviews about your business on the home page'],
                [productReviews, setProductReviews, 'Product / service reviews', 'Reviews on individual product and service pages'],
                [allowSubmission, setAllowSubmission, 'Allow new submissions', 'Users can submit new reviews (uncheck to only show existing ones)'],
                [reviewsModeration, setReviewsModeration, 'Moderation required', 'New reviews need approval before being visible (recommended)'],
              ].map(([val, setter, label, desc]) => (
                <label key={String(label)} className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={val as boolean} onChange={e => (setter as React.Dispatch<React.SetStateAction<boolean>>)(e.target.checked)} disabled={!isOwner} className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/30 disabled:opacity-50" />
                  <div>
                    <span className="text-sm">{String(label)}</span>
                    <p className="text-xs text-muted-foreground">{String(desc)}</p>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* AI Assistant */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 space-y-4">
        <div>
          <h2 className="text-sm font-medium">AI Assistant</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Connect a Telegram bot to answer customer questions with AI</p>
        </div>
        <div className="space-y-3">
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={assistantEnabled} onChange={e => setAssistantEnabled(e.target.checked)} disabled={!isOwner} className={checkboxClass} />
            <div>
              <span className="text-sm font-medium">Enable AI Assistant</span>
              <p className="text-xs text-muted-foreground">Show a help button that opens your Telegram bot</p>
            </div>
          </label>
          {assistantEnabled && isOwner && (
            <div className="ml-7 space-y-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Bot Username</label>
                <div className="flex items-center gap-1">
                  <span className="text-sm text-muted-foreground">@</span>
                  <input value={assistantBotUsername} onChange={e => setAssistantBotUsername(e.target.value.replace(/^@/, ''))} placeholder="my_business_bot" className={inputClass + ' font-mono'} />
                </div>
                <p className="text-xs text-muted-foreground mt-1">Create a bot via @BotFather in Telegram, then enter its username</p>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Button Text</label>
                <input value={assistantEntryCta} onChange={e => setAssistantEntryCta(e.target.value)} placeholder="Need help?" className={inputClass} />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Button Placement</label>
                <select value={assistantPlacement} onChange={e => setAssistantPlacement(e.target.value as typeof assistantPlacement)} className={inputClass}>
                  <option value="floating">Floating button (bottom-right)</option>
                  <option value="header">Header icon</option>
                  <option value="contacts">Contacts block</option>
                  <option value="product_page">Product pages only</option>
                </select>
              </div>
              {!assistantBotUsername && (
                <p className="text-xs text-warning-foreground">Enter a bot username to enable the assistant button in your mini app</p>
              )}
            </div>
          )}
        </div>
      </div>

      {isOwner && <Button onClick={handleSave} loading={saving} size="sm">Save Changes</Button>}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { admin } = useAdmin();
  const adminFetch = useAdminFetch();
  const [tenant, setTenant] = useState<TenantSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('General');

  useEffect(() => {
    if (!admin) return;
    adminFetch('/settings').then((data) => {
      if (data.success && data.tenant) setTenant(data.tenant);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [admin, adminFetch]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded-lg w-32 animate-pulse" />
        <div className="h-10 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
        <div className="h-60 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!tenant) {
    return <p className="text-muted-foreground text-sm">Failed to load settings</p>;
  }

  const isOwner = admin?.role === 'owner';

  return (
    <div className="space-y-4">
      <PageHeader title="Settings" />

      {/* Tab bar */}
      <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab
                ? 'bg-primary text-primary-foreground'
                : 'bg-gray-100 dark:bg-gray-800 text-muted-foreground hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'General' && <GeneralTab tenant={tenant} isOwner={isOwner} />}
      {activeTab === 'Payments' && <PaymentsTab tenant={tenant} isOwner={isOwner} />}
      {activeTab === 'Delivery' && <DeliveryTab tenant={tenant} isOwner={isOwner} />}
      {activeTab === 'Features' && <FeaturesTab tenant={tenant} isOwner={isOwner} />}

      {!isOwner && (
        <p className="text-xs text-muted-foreground">Only the owner can edit settings</p>
      )}
    </div>
  );
}
