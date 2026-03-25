'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAdmin, useAdminFetch } from '@/lib/admin/admin-context';
import { PageHeader } from '@/components/admin/page-header';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { useToast } from '@/components/admin/toast';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

interface PickupPoint {
  id: string;
  name: string;
  address: string;
  city?: string;
  phone?: string;
  workingHours?: string;
}

interface PointForm {
  name: string;
  address: string;
  city: string;
  phone: string;
  workingHours: string;
}

const EMPTY_FORM: PointForm = { name: '', address: '', city: '', phone: '', workingHours: '' };

const inputClass = "w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-primary/40";

export default function DeliveryPage() {
  const { admin } = useAdmin();
  const adminFetch = useAdminFetch();
  const { showToast } = useToast();

  const [points, setPoints] = useState<PickupPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Sheet state: null = closed, 'new' = create, PickupPoint = edit
  const [sheetTarget, setSheetTarget] = useState<'new' | PickupPoint | null>(null);
  const [form, setForm] = useState<PointForm>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<PickupPoint | null>(null);

  const loadPoints = useCallback(() => {
    adminFetch('/pickup-points')
      .then(data => { if (data.success) setPoints(data.points || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [adminFetch]);

  useEffect(() => {
    if (!admin) return;
    loadPoints();
  }, [admin, loadPoints]);

  function openNew() {
    setForm(EMPTY_FORM);
    setSheetTarget('new');
  }

  function openEdit(point: PickupPoint) {
    setForm({
      name: point.name,
      address: point.address,
      city: point.city || '',
      phone: point.phone || '',
      workingHours: point.workingHours || '',
    });
    setSheetTarget(point);
  }

  function closeSheet() {
    setSheetTarget(null);
    setForm(EMPTY_FORM);
  }

  function patch(field: Partial<PointForm>) {
    setForm(prev => ({ ...prev, ...field }));
  }

  async function handleSave() {
    if (!form.name.trim() || !form.address.trim()) return;
    setSaving(true);

    const body = {
      name: form.name.trim(),
      address: form.address.trim(),
      city: form.city.trim() || undefined,
      phone: form.phone.trim() || undefined,
      workingHours: form.workingHours.trim() || undefined,
    };

    if (sheetTarget === 'new') {
      const data = await adminFetch('/pickup-points', { method: 'POST', body: JSON.stringify(body) });
      if (data.success) {
        setPoints(prev => [...prev, data.point]);
        showToast('Pickup point added', 'success');
        closeSheet();
      } else {
        showToast('Failed to add point', 'error');
      }
    } else if (sheetTarget) {
      const data = await adminFetch('/pickup-points', {
        method: 'PATCH',
        body: JSON.stringify({ id: sheetTarget.id, ...body }),
      });
      if (data.success) {
        setPoints(prev => prev.map(p => p.id === sheetTarget.id ? { ...p, ...body } : p));
        showToast('Pickup point updated', 'success');
        closeSheet();
      } else {
        showToast('Failed to update point', 'error');
      }
    }

    setSaving(false);
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    const data = await adminFetch('/pickup-points', {
      method: 'DELETE',
      body: JSON.stringify({ id: deleteTarget.id }),
    });
    if (data.success) {
      setPoints(prev => prev.filter(p => p.id !== deleteTarget.id));
      showToast('Pickup point deleted', 'success');
    } else {
      showToast('Failed to delete', 'error');
    }
    setDeleteTarget(null);
  }

  const isOwner = admin?.role === 'owner';
  const isEditing = sheetTarget !== null && sheetTarget !== 'new';

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded-lg w-48 animate-pulse" />
        <div className="h-40 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Pickup Points"
        description={points.length > 0 ? `${points.length} configured` : undefined}
        actions={isOwner ? (
          <Button size="sm" onClick={openNew}>+ Add Point</Button>
        ) : undefined}
      />

      {/* Points list */}
      {points.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-8 text-center">
          <p className="text-muted-foreground text-sm">No pickup points configured yet</p>
          {isOwner && (
            <p className="text-muted-foreground text-xs mt-1">Add pickup points so customers can collect orders in person</p>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
          {points.map(point => (
            <div key={point.id} className="flex items-start justify-between gap-3 px-4 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{point.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{point.address}</p>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                  {point.city && <span className="text-xs text-muted-foreground">{point.city}</span>}
                  {point.phone && <span className="text-xs text-muted-foreground">{point.phone}</span>}
                  {point.workingHours && <span className="text-xs text-muted-foreground">{point.workingHours}</span>}
                </div>
              </div>
              {isOwner && (
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => openEdit(point)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    title="Edit"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setDeleteTarget(point)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-error-foreground hover:bg-error-bg transition-colors"
                    title="Delete"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Sheet */}
      <Sheet open={sheetTarget !== null} onOpenChange={(open) => { if (!open) closeSheet(); }}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="mb-4">
            <SheetTitle>{isEditing ? 'Edit Pickup Point' : 'New Pickup Point'}</SheetTitle>
          </SheetHeader>

          <div className="space-y-4">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Name <span className="text-error-foreground">*</span></label>
              <input value={form.name} onChange={e => patch({ name: e.target.value })} placeholder="Main Office" className={inputClass} />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Address <span className="text-error-foreground">*</span></label>
              <input value={form.address} onChange={e => patch({ address: e.target.value })} placeholder="123 Main St, Building 2" className={inputClass} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">City</label>
                <input value={form.city} onChange={e => patch({ city: e.target.value })} placeholder="Moscow" className={inputClass} />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Phone</label>
                <input value={form.phone} onChange={e => patch({ phone: e.target.value })} placeholder="+7 999 123-45-67" className={inputClass} />
              </div>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Working Hours</label>
              <input value={form.workingHours} onChange={e => patch({ workingHours: e.target.value })} placeholder="Mon-Fri 9:00-18:00" className={inputClass} />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                onClick={handleSave}
                loading={saving}
                disabled={!form.name.trim() || !form.address.trim()}
                className="flex-1"
              >
                {isEditing ? 'Save Changes' : 'Add Point'}
              </Button>
              <Button variant="outline" onClick={closeSheet} className="flex-1">Cancel</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete confirm */}
      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete Pickup Point"
        description={`Delete "${deleteTarget?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
