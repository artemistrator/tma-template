'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TypeSelector } from './type-selector';
import { ItemsEditor, type ItemData } from './items-editor';
import { StaffEditor, type StaffMember } from './staff-editor';
import { HoursEditor, type WorkingHourEntry } from './hours-editor';
import { FeaturesEditor, type FeatureItem } from './features-editor';
import { PromoEditor, type PromoData } from './promo-editor';
import { StylePresetSelector, type StylePreset } from './style-preset-selector';
import { ScenarioSelector, getDefaultScenario, type HomeScenario } from './scenario-selector';
import { ContactsEditor, type ContactsData } from './contacts-editor';
import { CtaEditor, type CtaData } from './cta-editor';
import { TestimonialsEditor, type TestimonialData } from './testimonials-editor';
import { SectionsEditor, getDefaultSectionOrder, type SectionsVisibility, type SectionKey } from './sections-editor';
import { BulkImageUpload } from './bulk-image-upload';
import { ImageDropZone } from './image-drop-zone';
import { TemplateSelector } from './template-selector';
import type { NicheTemplate } from './niche-templates';

export type AppType = 'ecommerce' | 'booking' | 'infobiz';

export interface BriefFormData {
  appType: AppType;
  name: string;
  slug: string;
  locale: string;
  currency: string;
  primaryColor?: string;
  secondaryColor?: string;
  items: ItemData[];
  staff?: StaffMember[];
  workingHours?: WorkingHourEntry[];
  features?: FeatureItem[];
  promo?: PromoData;
  style?: StylePreset;
  homeScenario?: HomeScenario;
  contacts?: ContactsData;
  cta?: CtaData;
  testimonials?: TestimonialData[];
  sections?: SectionsVisibility;
  sectionOrder?: SectionKey[];
}

/** Files attached to items, keyed by item index */
export type ImageFiles = Record<number, File>;

/** Files attached to staff, keyed by staff index (prefixed 'staff-') */
export type StaffImageFiles = Record<number, File>;

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60);
}

interface BriefFormProps {
  onSubmit: (data: BriefFormData, imageFiles: ImageFiles, logoFile: File | null, staffImageFiles: StaffImageFiles) => void;
  secret?: string;
}

export function BriefForm({ onSubmit, secret }: BriefFormProps) {
  const [appType, setAppType] = useState<AppType | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugManual, setSlugManual] = useState(false);
  const [locale, setLocale] = useState('ru');
  const [currency, setCurrency] = useState('RUB');
  const [primaryColor, setPrimaryColor] = useState('#3b82f6');
  const [secondaryColor, setSecondaryColor] = useState('#f59e0b');
  const [items, setItems] = useState<ItemData[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [workingHours, setWorkingHours] = useState<WorkingHourEntry[]>([]);
  const [features, setFeatures] = useState<FeatureItem[]>([]);
  const [promo, setPromo] = useState<PromoData | null>(null);
  const [style, setStyle] = useState<StylePreset>({ tone: 'friendly', density: 'balanced', visual: 'soft' });
  const [homeScenario, setHomeScenario] = useState<HomeScenario>('quick_order');
  const [contacts, setContacts] = useState<ContactsData>({});
  const [testimonials, setTestimonials] = useState<TestimonialData[]>([]);
  const [cta, setCta] = useState<CtaData>({ sticky: true, page: 'catalog' });
  const [sections, setSections] = useState<SectionsVisibility>({});
  const [sectionOrder, setSectionOrder] = useState<SectionKey[]>([]);

  // Logo
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  // Image files and previews
  const [imageFiles, setImageFiles] = useState<ImageFiles>({});
  const [imagePreviews, setImagePreviews] = useState<Record<number, string>>({});

  // Staff image files and previews
  const [staffImageFiles, setStaffImageFiles] = useState<StaffImageFiles>({});
  const [staffImagePreviews, setStaffImagePreviews] = useState<Record<number, string>>({});

  // Quick mode
  const [quickMode, setQuickMode] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<NicheTemplate | null>(null);

  const applyTemplate = useCallback((tmpl: NicheTemplate) => {
    setAppType(tmpl.appType);
    setLocale(tmpl.locale);
    setCurrency(tmpl.currency);
    setPrimaryColor(tmpl.primaryColor);
    setSecondaryColor(tmpl.secondaryColor);
    setItems(tmpl.items);
    if (tmpl.staff) setStaff(tmpl.staff);
    if (tmpl.workingHours) setWorkingHours(tmpl.workingHours);
    setName('');
    setSlug('');
    setSlugManual(false);
    setImageFiles({});
    setImagePreviews({});
    setStaffImageFiles({});
    setStaffImagePreviews({});
    setQuickMode(true);
    setSelectedTemplate(tmpl);
  }, []);

  const handleNameChange = useCallback(
    (value: string) => {
      setName(value);
      if (!slugManual) setSlug(toSlug(value));
    },
    [slugManual],
  );

  const handleSlugChange = useCallback((value: string) => {
    setSlugManual(true);
    setSlug(value.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 60));
  }, []);

  // Logo handlers
  const handleLogoFile = useCallback((file: File) => {
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = () => setLogoPreview(reader.result as string);
    reader.readAsDataURL(file);
  }, []);

  const handleLogoRemove = useCallback(() => {
    setLogoFile(null);
    setLogoPreview(null);
  }, []);

  // Item image handlers
  const handleImageAttach = useCallback((index: number, file: File) => {
    setImageFiles((prev) => ({ ...prev, [index]: file }));
    const reader = new FileReader();
    reader.onload = () => {
      setImagePreviews((prev) => ({ ...prev, [index]: reader.result as string }));
    };
    reader.readAsDataURL(file);
  }, []);

  const handleImageRemove = useCallback((index: number) => {
    setImageFiles((prev) => { const n = { ...prev }; delete n[index]; return n; });
    setImagePreviews((prev) => { const n = { ...prev }; delete n[index]; return n; });
  }, []);

  const handleBulkMatch = useCallback(
    (matches: Record<number, File>) => {
      for (const [indexStr, file] of Object.entries(matches)) {
        handleImageAttach(parseInt(indexStr), file);
      }
    },
    [handleImageAttach],
  );

  // Staff image handlers
  const handleStaffImageAttach = useCallback((index: number, file: File) => {
    setStaffImageFiles((prev) => ({ ...prev, [index]: file }));
    const reader = new FileReader();
    reader.onload = () => {
      setStaffImagePreviews((prev) => ({ ...prev, [index]: reader.result as string }));
    };
    reader.readAsDataURL(file);
  }, []);

  const handleStaffImageRemove = useCallback((index: number) => {
    setStaffImageFiles((prev) => { const n = { ...prev }; delete n[index]; return n; });
    setStaffImagePreviews((prev) => { const n = { ...prev }; delete n[index]; return n; });
  }, []);

  const [aiLoading, setAiLoading] = useState<'items' | 'marketing' | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  async function handleAiGenerateItems() {
    if (!appType || !secret || !name.trim()) return;
    setAiLoading('items');
    try {
      const res = await fetch('/api/orchestrator/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secret}` },
        body: JSON.stringify({ mode: 'items', appType, prompt: name.trim() }),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.items)) {
        setItems(data.items.map((it: Record<string, unknown>) => ({
          name: String(it.name || ''),
          price: Number(it.price) || 0,
          category: it.category ? String(it.category) : undefined,
          description: it.description ? String(it.description) : undefined,
          duration: it.duration ? Number(it.duration) : undefined,
          type: it.type ? String(it.type) : undefined,
          slug: it.slug ? String(it.slug) : undefined,
        })));
      } else {
        alert(data.error || 'Failed to generate items');
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Network error');
    } finally {
      setAiLoading(null);
    }
  }

  async function handleAiGenerateMarketing() {
    if (!appType || !secret || !name.trim()) return;
    setAiLoading('marketing');
    try {
      const res = await fetch('/api/orchestrator/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secret}` },
        body: JSON.stringify({
          mode: 'marketing',
          appType,
          prompt: name.trim(),
          context: {
            name: name.trim(),
            items: items.map(it => ({ name: it.name, category: it.category })),
            locale,
          },
        }),
      });
      const data = await res.json();
      if (data.success && data.marketing) {
        const m = data.marketing as Record<string, unknown>;
        if (Array.isArray(m.features)) {
          setFeatures(m.features.map((f: Record<string, unknown>) => ({
            icon: String(f.icon || '⭐'),
            title: String(f.title || ''),
            description: String(f.description || ''),
          })));
        }
      } else {
        alert(data.error || 'Failed to generate marketing');
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Network error');
    } finally {
      setAiLoading(null);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!appType || !name.trim() || !slug.trim() || items.length === 0) return;

    const errors: string[] = [];
    const emptyItems = items.filter((it) => !it.name.trim());
    if (emptyItems.length > 0) errors.push(`${emptyItems.length} item(s) have no name`);
    const zeroPriceItems = items.filter((it) => it.price <= 0);
    if (zeroPriceItems.length > 0 && appType !== 'infobiz') errors.push(`${zeroPriceItems.length} item(s) have zero or negative price`);
    if (slug.length < 2) errors.push('Slug must be at least 2 characters');
    if (appType === 'booking') {
      const emptyStaff = staff.filter((s) => !s.name.trim());
      if (emptyStaff.length > 0) errors.push(`${emptyStaff.length} staff member(s) have no name`);
    }
    if (errors.length > 0) { setValidationErrors(errors); return; }
    setValidationErrors([]);

    const data: BriefFormData = {
      appType,
      name: name.trim(),
      slug,
      locale,
      currency,
      primaryColor,
      secondaryColor,
      items,
    };

    if (appType === 'booking') {
      if (staff.length > 0) data.staff = staff;
      if (workingHours.length > 0) data.workingHours = workingHours;
    }

    if (features.length > 0) data.features = features;
    if (promo && promo.title.trim()) data.promo = promo;
    if (testimonials.length > 0) data.testimonials = testimonials;
    data.style = style;
    data.homeScenario = homeScenario;
    const hasContacts = contacts.phone || contacts.telegram || contacts.whatsapp || contacts.address || (contacts.socials && contacts.socials.length > 0);
    if (hasContacts) data.contacts = contacts;
    if (cta.text?.trim()) data.cta = cta;

    // Only include sections with explicit false values (disabled sections)
    const hasDisabledSections = Object.values(sections).some(v => v === false);
    if (hasDisabledSections) data.sections = sections;
    if (sectionOrder.length > 0) data.sectionOrder = sectionOrder;

    onSubmit(data, imageFiles, logoFile, staffImageFiles);
  }

  const isValid = appType && name.trim() && slug.trim() && items.length > 0;
  const imageCount = Object.keys(imageFiles).length;
  const staffImageCount = Object.keys(staffImageFiles).length;

  const itemLabel =
    appType === 'ecommerce' ? 'Products'
      : appType === 'booking' ? 'Services'
        : appType === 'infobiz' ? 'Info Products'
          : 'Items';

  // Readiness score
  const checks = [
    { label: 'Business name', ok: !!name.trim() },
    { label: 'Slug', ok: slug.length >= 2 },
    { label: 'Logo', ok: !!logoFile },
    { label: 'Promo', ok: !!promo?.title?.trim() },
    { label: 'Features', ok: features.length > 0 },
    { label: itemLabel, ok: items.length > 0 },
  ];
  const readiness = Math.round((checks.filter(c => c.ok).length / checks.length) * 100);

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_320px]">
        {/* ─── Main column ──────────────────────────────────────── */}
        <div className="space-y-6">
          {/* Quick start templates */}
          <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">Quick start templates</h2>
                <p className="mt-1 text-sm text-zinc-500">Pick a production preset and adapt it for the client.</p>
              </div>
            </div>
            <div className="mt-5">
              <TemplateSelector appType={appType} onSelect={applyTemplate} />
            </div>
          </section>

          {/* Quick Mode card */}
          {quickMode && selectedTemplate && (
            <section className="rounded-3xl border border-blue-200 bg-blue-50/50 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold">
                    Quick Mode — {selectedTemplate.title}
                  </h2>
                  <p className="text-sm text-zinc-500">
                    {selectedTemplate.description} &middot; {items.length} {itemLabel.toLowerCase()} &middot;{' '}
                    {selectedTemplate.locale.toUpperCase()} &middot; {selectedTemplate.currency}
                    {selectedTemplate.staff && ` \u00b7 ${selectedTemplate.staff.length} staff`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setQuickMode(false)}
                  className="rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm hover:bg-zinc-50"
                >
                  Customize
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-medium">Business name</label>
                  <Input value={name} onChange={(e) => handleNameChange(e.target.value)} placeholder={`e.g. "My ${selectedTemplate.title}"`} required autoFocus className="rounded-2xl" />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">URL slug</label>
                  <Input value={slug} onChange={(e) => handleSlugChange(e.target.value)} placeholder={`my-${selectedTemplate.id}`} pattern="^[a-z0-9-]+$" required className="rounded-2xl" />
                </div>
              </div>

              {/* Pre-filled chips */}
              <div className="flex flex-wrap gap-2 mt-4">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white border px-3 py-1 text-xs">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: primaryColor }} />
                  {primaryColor}
                </span>
                <span className="inline-flex rounded-full bg-white border px-3 py-1 text-xs capitalize">{appType}</span>
                {items.slice(0, 3).map((it, i) => (
                  <span key={i} className="inline-flex rounded-full bg-white border px-3 py-1 text-xs">{it.name}</span>
                ))}
                {items.length > 3 && (
                  <span className="inline-flex rounded-full bg-white border px-3 py-1 text-xs text-zinc-500">+{items.length - 3} more</span>
                )}
              </div>

              {validationErrors.length > 0 && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-3 mt-4">
                  <ul className="list-disc list-inside text-sm text-red-600 space-y-0.5">
                    {validationErrors.map((err, i) => <li key={i}>{err}</li>)}
                  </ul>
                </div>
              )}
            </section>
          )}

          {/* Full form */}
          {!quickMode && (
            <>
              {/* App Type */}
              <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold mb-1">App type</h2>
                <p className="text-sm text-zinc-500 mb-5">Choose the type of business for this Mini App.</p>
                <TypeSelector value={appType} onChange={(t) => { setAppType(t); if (t) { setHomeScenario(getDefaultScenario(t)); setSectionOrder(getDefaultSectionOrder(t)); setSections({}); } }} />
              </section>

              {appType && (
                <>
                  {/* Basic info */}
                  <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-xl font-semibold">Basic info</h2>
                        <p className="mt-1 text-sm text-zinc-500">Business identity, style and entry-point settings.</p>
                      </div>
                      <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-600">
                        Readiness {readiness}%
                      </div>
                    </div>

                    <div className="mt-6 grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-medium">Business name</label>
                        <Input value={name} onChange={(e) => handleNameChange(e.target.value)} placeholder='e.g. "Pizza Palace"' required className="rounded-2xl" />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium">URL slug</label>
                        <div className="flex gap-2">
                          <Input value={slug} onChange={(e) => handleSlugChange(e.target.value)} placeholder="pizza-palace" pattern="^[a-z0-9-]+$" required className="rounded-2xl" />
                        </div>
                        <p className="text-xs text-zinc-500 mt-1">Lowercase letters, numbers and dashes only</p>
                      </div>
                    </div>

                    <div className="mt-6 grid gap-6 lg:grid-cols-[200px_1fr]">
                      {/* Logo */}
                      <div>
                        <label className="mb-2 block text-sm font-medium">Logo</label>
                        <div className="flex aspect-square items-center justify-center rounded-3xl border border-dashed border-zinc-300 bg-zinc-50 overflow-hidden">
                          <ImageDropZone
                            preview={logoPreview}
                            onFile={handleLogoFile}
                            onRemove={handleLogoRemove}
                            className="!h-full !w-full !rounded-3xl"
                          />
                        </div>
                        <p className="text-xs text-zinc-500 mt-1.5 text-center">Drop logo here</p>
                      </div>

                      {/* Colors + locale/currency */}
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                          <div>
                            <label className="text-sm font-medium mb-1.5 block">Language</label>
                            <select
                              value={locale}
                              onChange={(e) => setLocale(e.target.value)}
                              className="flex h-9 w-full rounded-xl border border-zinc-200 bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            >
                              <option value="ru">Русский</option>
                              <option value="en">English</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-sm font-medium mb-1.5 block">Currency</label>
                            <select
                              value={currency}
                              onChange={(e) => setCurrency(e.target.value)}
                              className="flex h-9 w-full rounded-xl border border-zinc-200 bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            >
                              <option value="RUB">RUB</option>
                              <option value="USD">USD</option>
                              <option value="EUR">EUR</option>
                              <option value="KZT">KZT</option>
                              <option value="UAH">UAH</option>
                              <option value="BYN">BYN</option>
                              <option value="GEL">GEL</option>
                              <option value="TRY">TRY</option>
                              <option value="UZS">UZS</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-sm font-medium mb-1.5 block">Primary</label>
                            <div className="flex gap-2 items-center">
                              <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="h-9 w-12 rounded border border-zinc-200 cursor-pointer" />
                              <span className="text-xs text-zinc-500">{primaryColor}</span>
                            </div>
                          </div>
                          <div>
                            <label className="text-sm font-medium mb-1.5 block">Secondary</label>
                            <div className="flex gap-2 items-center">
                              <input type="color" value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} className="h-9 w-12 rounded border border-zinc-200 cursor-pointer" />
                              <span className="text-xs text-zinc-500">{secondaryColor}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Brand Style Preset */}
                  <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
                    <h2 className="text-xl font-semibold">Brand Style</h2>
                    <p className="mt-1 text-sm text-zinc-500 mb-5">
                      Choose tone, density and visual style for the app.
                    </p>
                    <StylePresetSelector value={style} onChange={setStyle} />
                  </section>

                  {/* Home Scenario */}
                  <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
                    <h2 className="text-xl font-semibold">Home Page Scenario</h2>
                    <p className="mt-1 text-sm text-zinc-500 mb-5">
                      Choose the main focus and flow of the home page.
                    </p>
                    <ScenarioSelector appType={appType} value={homeScenario} onChange={setHomeScenario} />
                  </section>

                  {/* Products / Services */}
                  <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-xl font-semibold">{itemLabel}</h2>
                        <p className="mt-1 text-sm text-zinc-500">Add items manually, from CSV, or generate with AI.</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-600">
                          {items.length} items &middot; {imageCount} images
                        </span>
                        {secret && name.trim() && (
                          <button
                            type="button"
                            disabled={aiLoading === 'items'}
                            onClick={handleAiGenerateItems}
                            className="rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm hover:bg-zinc-50 disabled:opacity-50"
                          >
                            {aiLoading === 'items' ? 'Generating...' : `AI: Generate ${itemLabel}`}
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="mt-5 space-y-4">
                      {items.length === 0 ? (
                        <div className="rounded-3xl border border-dashed border-zinc-300 bg-zinc-50 p-8 text-center">
                          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm text-2xl">
                            {appType === 'booking' ? '💇' : appType === 'infobiz' ? '📚' : '📦'}
                          </div>
                          <h3 className="mt-4 text-lg font-semibold">No {itemLabel.toLowerCase()} yet</h3>
                          <p className="mx-auto mt-2 max-w-lg text-sm text-zinc-500">
                            Start from a CSV, generate demo content with AI, or add the first {itemLabel.toLowerCase().replace(/s$/, '')} manually.
                          </p>
                          <div className="mt-5 flex flex-wrap justify-center gap-2">
                            <button type="button" onClick={() => setItems([{ name: '', price: 0 }])} className="rounded-2xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white">
                              Add {itemLabel.toLowerCase().replace(/s$/, '')}
                            </button>
                            {secret && name.trim() && (
                              <button type="button" disabled={aiLoading === 'items'} onClick={handleAiGenerateItems} className="rounded-2xl border border-zinc-200 bg-white px-4 py-2 text-sm disabled:opacity-50">
                                {aiLoading === 'items' ? 'Generating...' : 'Generate with AI'}
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <>
                          <BulkImageUpload itemNames={items.map((it) => it.name)} onMatch={handleBulkMatch} />
                          <ItemsEditor
                            appType={appType}
                            items={items}
                            onChange={setItems}
                            imagePreviews={imagePreviews}
                            onImageAttach={handleImageAttach}
                            onImageRemove={handleImageRemove}
                          />
                        </>
                      )}
                    </div>
                  </section>

                  {/* Booking extras: Staff + Hours */}
                  {appType === 'booking' && (
                    <>
                      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
                        <h2 className="text-xl font-semibold">Staff</h2>
                        <p className="mt-1 text-sm text-zinc-500 mb-5">
                          Add team members with photos and roles (optional).
                        </p>
                        <StaffEditor
                          staff={staff}
                          onChange={setStaff}
                          imagePreviews={staffImagePreviews}
                          onImageAttach={handleStaffImageAttach}
                          onImageRemove={handleStaffImageRemove}
                        />
                      </section>

                      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
                        <h2 className="text-xl font-semibold">Working Hours</h2>
                        <p className="mt-1 text-sm text-zinc-500 mb-5">
                          Set schedule (optional, defaults to Mon-Fri 9:00-18:00).
                        </p>
                        <HoursEditor hours={workingHours} onChange={setWorkingHours} />
                      </section>
                    </>
                  )}

                  {/* Promo Banner */}
                  <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
                    <h2 className="text-xl font-semibold">Promo Banner</h2>
                    <p className="mt-1 text-sm text-zinc-500 mb-5">
                      Optional promotional banner shown on the home page.
                    </p>
                    <PromoEditor promo={promo} onChange={setPromo} />
                  </section>

                  {/* Features / Why Choose Us */}
                  <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-xl font-semibold">Why Choose Us</h2>
                        <p className="mt-1 text-sm text-zinc-500">
                          Feature cards shown on the home page. Leave empty for defaults.
                        </p>
                      </div>
                      {secret && name.trim() && items.length > 0 && (
                        <button
                          type="button"
                          disabled={aiLoading === 'marketing'}
                          onClick={handleAiGenerateMarketing}
                          className="rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm hover:bg-zinc-50 disabled:opacity-50"
                        >
                          {aiLoading === 'marketing' ? 'Generating...' : 'AI: Generate features'}
                        </button>
                      )}
                    </div>
                    <div className="mt-5">
                      <FeaturesEditor features={features} onChange={setFeatures} />
                    </div>
                  </section>

                  {/* Testimonials */}
                  <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
                    <h2 className="text-xl font-semibold">Testimonials</h2>
                    <p className="mt-1 text-sm text-zinc-500 mb-5">
                      Customer reviews shown on the home page. Leave empty for defaults.
                    </p>
                    <TestimonialsEditor testimonials={testimonials} onChange={setTestimonials} />
                  </section>

                  {/* Contacts */}
                  <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
                    <h2 className="text-xl font-semibold">Contacts</h2>
                    <p className="mt-1 text-sm text-zinc-500 mb-5">
                      Contact info shown at the bottom of the home page. All fields optional.
                    </p>
                    <ContactsEditor contacts={contacts} onChange={setContacts} />
                  </section>

                  {/* Sticky CTA */}
                  <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
                    <h2 className="text-xl font-semibold">CTA Button</h2>
                    <p className="mt-1 text-sm text-zinc-500 mb-5">
                      Main call-to-action button. When sticky, it stays fixed at the bottom of the screen.
                    </p>
                    <CtaEditor cta={cta} onChange={setCta} />
                  </section>

                  {/* Section Visibility & Order */}
                  <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
                    <h2 className="text-xl font-semibold">Home Page Sections</h2>
                    <p className="mt-1 text-sm text-zinc-500 mb-5">
                      Toggle sections on/off and reorder them with arrows.
                    </p>
                    <SectionsEditor
                      appType={appType}
                      sections={sections}
                      sectionOrder={sectionOrder.length > 0 ? sectionOrder : getDefaultSectionOrder(appType)}
                      onSectionsChange={setSections}
                      onOrderChange={setSectionOrder}
                    />
                  </section>

                  {/* Validation errors */}
                  {validationErrors.length > 0 && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                      <p className="text-sm font-medium text-red-600 mb-1">Please fix before continuing:</p>
                      <ul className="list-disc list-inside text-sm text-red-600 space-y-0.5">
                        {validationErrors.map((err, i) => <li key={i}>{err}</li>)}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>

        {/* ─── Sidebar ──────────────────────────────────────────── */}
        {(quickMode || appType) && (
          <aside className="h-fit xl:sticky xl:top-6">
            <div className="space-y-4 rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div>
                <div className="text-sm font-medium text-zinc-500">Project summary</div>
                <div className="mt-2 text-2xl font-semibold">{name || 'Untitled'}</div>
                <div className="mt-1 text-sm text-zinc-500">
                  {appType ? `${appType.charAt(0).toUpperCase() + appType.slice(1)}` : ''} &middot; {locale.toUpperCase()} &middot; {currency}
                </div>
              </div>

              {/* Readiness */}
              <div className="rounded-2xl bg-zinc-50 p-4">
                <div className="text-sm font-medium">Readiness score</div>
                <div className="mt-2 text-3xl font-semibold">{readiness}%</div>
                <div className="mt-2 h-2 rounded-full bg-zinc-200">
                  <div className="h-2 rounded-full bg-zinc-900 transition-all" style={{ width: `${readiness}%` }} />
                </div>
              </div>

              {/* Checklist */}
              <div>
                <div className="mb-2 text-sm font-medium">Checklist</div>
                <div className="space-y-2 text-sm">
                  {checks.map((c) => (
                    <div key={c.label} className="flex items-center justify-between rounded-2xl bg-zinc-50 px-3 py-3">
                      <span>{c.label}</span>
                      <span className={c.ok ? 'text-emerald-600' : 'text-amber-600'}>{c.ok ? 'Done' : 'Missing'}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick actions */}
              <div className="border-t border-zinc-200 pt-4">
                <div className="mb-3 text-sm font-medium">Quick actions</div>
                <div className="flex flex-col gap-2">
                  <Button
                    type="submit"
                    disabled={!isValid}
                    className="rounded-2xl bg-zinc-900 px-4 py-3 text-sm font-medium text-white hover:bg-zinc-800"
                  >
                    GO — Assemble App
                  </Button>
                </div>
              </div>

              {/* Stats */}
              <div className="text-xs text-zinc-500 space-y-1">
                <p>{items.length} {itemLabel.toLowerCase()}{imageCount > 0 ? `, ${imageCount} images` : ''}</p>
                {appType === 'booking' && staff.length > 0 && <p>{staff.length} staff{staffImageCount > 0 ? `, ${staffImageCount} photos` : ''}</p>}
                {features.length > 0 && <p>{features.length} features</p>}
                {testimonials.length > 0 && <p>{testimonials.length} testimonials</p>}
                {promo?.title && <p>Promo banner set</p>}
                {logoFile && <p>Logo attached</p>}
                <p>Style: {style.tone} / {style.density} / {style.visual}</p>
              </div>
            </div>
          </aside>
        )}
      </div>
    </form>
  );
}
