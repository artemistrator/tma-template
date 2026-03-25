'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAdmin, useAdminFetch } from '@/lib/admin/admin-context';
import { PageHeader } from '@/components/admin/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { useToast } from '@/components/admin/toast';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

interface ProductItem {
  id: string | number;
  name: string;
  price: number;
  description?: string;
  category?: string;
  status: string;
  stock_quantity?: number;
  duration?: number;
  type?: string;
  slug?: string;
  image?: string;
}

const COLLECTION_LABELS: Record<string, { singular: string; plural: string }> = {
  products: { singular: 'Product', plural: 'Products' },
  services: { singular: 'Service', plural: 'Services' },
  info_products: { singular: 'Info Product', plural: 'Info Products' },
};

// ---- StockInput ----
function StockInput({ value, onChange }: { value: number | undefined; onChange: (v: number) => void }) {
  const isUnlimited = value === undefined || value === -1;
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">Stock</label>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(isUnlimited ? 0 : -1)}
          className={`px-2.5 py-1.5 text-xs rounded-lg border transition-colors ${
            isUnlimited
              ? 'bg-success-bg border-success/30 text-success-foreground'
              : 'border-gray-200 dark:border-gray-700 text-muted-foreground hover:bg-gray-50 dark:hover:bg-gray-800'
          }`}
        >
          Unlimited
        </button>
        {!isUnlimited && (
          <input
            type="number"
            min="0"
            value={value ?? 0}
            onChange={e => onChange(Math.max(0, Number(e.target.value)))}
            placeholder="Qty"
            className="w-24 px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800"
          />
        )}
      </div>
    </div>
  );
}

// ---- ImageUpload ----
function ImageUpload({
  currentImage,
  onUploaded,
  slug,
  token,
}: {
  currentImage?: string;
  onUploaded: (assetId: string | null) => void;
  slug: string;
  token: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const imageUrl = preview || (currentImage ? `/api/assets/${currentImage}` : null);

  async function handleFile(file: File) {
    if (file.size > 5 * 1024 * 1024) { alert('File too large (max 5MB)'); return; }
    if (!file.type.startsWith('image/')) { alert('Only images are allowed'); return; }

    setPreview(URL.createObjectURL(file));
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`/api/admin/${slug}/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (data.success && data.assetId) {
        onUploaded(data.assetId);
      } else {
        alert(data.error || 'Upload failed');
        setPreview(null);
      }
    } catch {
      alert('Upload failed');
      setPreview(null);
    }
    setUploading(false);
  }

  function handleRemove() {
    setPreview(null);
    onUploaded(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-muted-foreground">Photo</label>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFile(file); }}
      />
      {imageUrl ? (
        <div className="relative inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt="Product"
            className="w-24 h-24 object-cover rounded-xl border border-gray-200 dark:border-gray-700"
          />
          {uploading && (
            <div className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          <div className="flex gap-2 mt-1.5">
            <button type="button" onClick={() => inputRef.current?.click()} className="text-xs text-primary hover:underline">Change</button>
            <button type="button" onClick={handleRemove} className="text-xs text-error-foreground hover:underline">Remove</button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-24 h-24 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl flex flex-col items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors"
        >
          {uploading ? (
            <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              <span className="text-[10px] mt-1">Photo</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}

// ---- ProductForm ----
type FormData = Partial<ProductItem>;

function ProductForm({
  form,
  onChange,
  collection,
  slug,
  token,
}: {
  form: FormData;
  onChange: (patch: Partial<FormData>) => void;
  collection: string;
  slug: string;
  token: string;
}) {
  const inputClass = "w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-primary/40";

  return (
    <div className="space-y-4 py-2">
      <ImageUpload
        currentImage={form.image}
        slug={slug}
        token={token}
        onUploaded={(assetId) => onChange({ image: assetId || undefined })}
      />

      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">Name *</label>
        <input
          value={form.name || ''}
          onChange={e => onChange({ name: e.target.value })}
          className={inputClass}
          placeholder="Product name"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Price *</label>
          <input
            type="number"
            value={form.price || ''}
            onChange={e => onChange({ price: Number(e.target.value) })}
            className={inputClass}
            placeholder="0"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Category</label>
          <input
            value={form.category || ''}
            onChange={e => onChange({ category: e.target.value })}
            className={inputClass}
            placeholder="Category"
          />
        </div>
      </div>

      {collection === 'services' && (
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Duration (minutes)</label>
          <input
            type="number"
            value={form.duration || ''}
            onChange={e => onChange({ duration: Number(e.target.value) })}
            className={inputClass}
            placeholder="60"
          />
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">Description</label>
        <textarea
          value={form.description || ''}
          onChange={e => onChange({ description: e.target.value })}
          rows={3}
          className={inputClass}
          placeholder="Optional description"
        />
      </div>

      {collection === 'products' && (
        <StockInput
          value={form.stock_quantity ?? -1}
          onChange={v => onChange({ stock_quantity: v })}
        />
      )}
    </div>
  );
}

// ---- Main Page ----
export default function ProductsPage() {
  const { admin, token, slug } = useAdmin();
  const adminFetch = useAdminFetch();
  const { showToast } = useToast();

  const [items, setItems] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [collection, setCollection] = useState('products');

  // Sheet state: null = closed, 'new' = create mode, item = edit mode
  const [sheetMode, setSheetMode] = useState<'new' | 'edit' | null>(null);
  const [editTarget, setEditTarget] = useState<ProductItem | null>(null);
  const [form, setForm] = useState<FormData>({});
  const [saving, setSaving] = useState(false);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<ProductItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const labels = COLLECTION_LABELS[collection] || COLLECTION_LABELS.products;

  const loadItems = useCallback(async () => {
    if (!admin) return;
    setLoading(true);
    const data = await adminFetch('/products?limit=200');
    if (data.success) {
      setItems(data.items || []);
      setCollection(data.collection || 'products');
    }
    setLoading(false);
  }, [admin, adminFetch]);

  useEffect(() => { loadItems(); }, [loadItems]);

  function openNew() {
    setEditTarget(null);
    setForm({ stock_quantity: -1 });
    setSheetMode('new');
  }

  function openEdit(item: ProductItem) {
    setEditTarget(item);
    setForm({
      name: item.name,
      price: item.price,
      description: item.description,
      category: item.category,
      image: item.image,
      stock_quantity: item.stock_quantity ?? -1,
      duration: item.duration,
    });
    setSheetMode('edit');
  }

  function closeSheet() {
    setSheetMode(null);
    setEditTarget(null);
    setForm({});
  }

  async function handleSave() {
    if (!form.name || !form.price) return;
    setSaving(true);

    if (sheetMode === 'new') {
      const body: Record<string, unknown> = {
        name: form.name,
        price: Number(form.price),
        description: form.description || '',
        category: form.category || '',
        status: collection === 'services' ? 'active' : 'published',
        stock_quantity: form.stock_quantity !== undefined ? Number(form.stock_quantity) : -1,
      };
      if (form.image) body.image = form.image;
      if (collection === 'services' && form.duration) body.duration = Number(form.duration);
      if (collection === 'info_products') {
        body.slug = (form.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '');
        body.type = form.type || 'article';
      }

      const data = await adminFetch('/products', { method: 'POST', body: JSON.stringify(body) });
      if (data.success) {
        setItems(prev => [data.item, ...prev]);
        closeSheet();
        showToast(`${labels.singular} created`, 'success');
      } else {
        showToast(data.error || 'Failed to create', 'error');
      }
    } else if (sheetMode === 'edit' && editTarget) {
      const payload: Record<string, unknown> = { ...form };
      if (form.image === undefined) delete payload.image;
      if (payload.stock_quantity !== undefined) payload.stock_quantity = Number(payload.stock_quantity);

      const data = await adminFetch(`/products/${editTarget.id}`, { method: 'PATCH', body: JSON.stringify(payload) });
      if (data.success) {
        setItems(prev => prev.map(it => it.id === editTarget.id ? { ...it, ...form } : it));
        closeSheet();
        showToast('Changes saved', 'success');
      } else {
        showToast(data.error || 'Failed to save', 'error');
      }
    }
    setSaving(false);
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    setDeleting(true);
    const data = await adminFetch(`/products/${deleteTarget.id}`, { method: 'DELETE' });
    if (data.success) {
      setItems(prev => prev.filter(it => it.id !== deleteTarget.id));
      showToast(`${labels.singular} deleted`, 'success');
    } else {
      showToast('Failed to delete', 'error');
    }
    setDeleting(false);
    setDeleteTarget(null);
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded-lg w-32 animate-pulse" />
        {[1, 2, 3].map(i => (
          <div key={i} className="h-20 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <PageHeader
          title={labels.plural}
          description={items.length > 0 ? `${items.length} total` : undefined}
          actions={
            <Button size="sm" onClick={openNew}>
              + New {labels.singular}
            </Button>
          }
        />

        {/* Items list */}
        {items.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-lg mb-1">No {labels.plural.toLowerCase()}</p>
            <p className="text-sm">Click &ldquo;+ New {labels.singular}&rdquo; to add one</p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                <div className="flex items-start gap-3">
                  {item.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`/api/assets/${item.image}`}
                      alt={item.name}
                      className="w-12 h-12 object-cover rounded-lg border border-gray-200 dark:border-gray-700 shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
                      </svg>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{item.name}</p>
                      <StatusBadge status={item.status} size="sm" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {item.price.toLocaleString()}
                      {item.category && ` · ${item.category}`}
                      {item.duration && ` · ${item.duration} min`}
                      {item.stock_quantity !== undefined && item.stock_quantity !== null && item.stock_quantity >= 0 && (
                        <span className={item.stock_quantity === 0 ? 'text-error-foreground font-medium' : item.stock_quantity <= 5 ? 'text-warning-foreground' : ''}>
                          {' · '}{item.stock_quantity === 0 ? 'Out of stock' : `Stock: ${item.stock_quantity}`}
                        </span>
                      )}
                    </p>
                    {item.description && (
                      <p className="text-xs text-muted-foreground/70 mt-1 line-clamp-1">{item.description}</p>
                    )}
                  </div>
                  <div className="flex gap-1 ml-2 shrink-0">
                    <button
                      onClick={() => openEdit(item)}
                      className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-muted-foreground hover:text-foreground"
                      title="Edit"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setDeleteTarget(item)}
                      className="p-1.5 rounded-lg hover:bg-error-bg transition-colors text-muted-foreground hover:text-error-foreground"
                      title="Delete"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create / Edit Sheet */}
      <Sheet open={sheetMode !== null} onOpenChange={(open) => { if (!open) closeSheet(); }}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="mb-4">
            <SheetTitle>{sheetMode === 'new' ? `New ${labels.singular}` : `Edit ${labels.singular}`}</SheetTitle>
          </SheetHeader>

          <ProductForm
            form={form}
            onChange={(patch) => setForm(prev => ({ ...prev, ...patch }))}
            collection={collection}
            slug={slug}
            token={token}
          />

          <div className="flex gap-3 pt-6 border-t mt-6">
            <Button
              onClick={handleSave}
              loading={saving}
              disabled={!form.name || !form.price}
              className="flex-1"
            >
              {sheetMode === 'new' ? 'Create' : 'Save changes'}
            </Button>
            <Button variant="outline" onClick={closeSheet} disabled={saving}>
              Cancel
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={deleteTarget !== null}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
        title={`Delete "${deleteTarget?.name}"?`}
        description="This will permanently delete the item. This cannot be undone."
        confirmText="Delete"
        variant="destructive"
        loading={deleting}
      />
    </>
  );
}
