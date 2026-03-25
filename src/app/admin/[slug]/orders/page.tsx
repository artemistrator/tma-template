'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAdmin, useAdminFetch } from '@/lib/admin/admin-context';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { PageHeader } from '@/components/admin/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { useToast } from '@/components/admin/toast';
import {
  ORDER_STATUSES,
  BOOKING_STATUSES,
  ORDER_TRANSITIONS,
  BOOKING_TRANSITIONS,
  withAllFilter,
} from '@/components/admin/status-config';

interface OrderItem {
  id: string | number;
  customer_name: string;
  customer_phone?: string;
  total?: number;
  status: string;
  date?: string;
  created_at: string;
}

// ─── Quick status dropdown ────────────────────────────────────────────────────

function QuickStatusMenu({
  itemId,
  currentStatus,
  isBooking,
  onChanged,
}: {
  itemId: string | number;
  currentStatus: string;
  isBooking: boolean;
  onChanged: (id: string | number, newStatus: string) => void;
}) {
  const adminFetch = useAdminFetch();
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const transitions = isBooking ? BOOKING_TRANSITIONS : ORDER_TRANSITIONS;
  const nextStatuses = transitions[currentStatus] || [];
  const allStatuses = isBooking ? BOOKING_STATUSES : ORDER_STATUSES;

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  if (nextStatuses.length === 0) return null;

  async function handleSelect(newStatus: string) {
    setSaving(true);
    setOpen(false);
    const data = await adminFetch(`/orders/${itemId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: newStatus }),
    });
    setSaving(false);
    if (data.success) {
      onChanged(itemId, newStatus);
      showToast(`Status → ${newStatus}`, 'success');
    } else {
      showToast('Failed to update status', 'error');
    }
  }

  return (
    <div ref={ref} className="relative" onClick={e => e.preventDefault()}>
      <button
        onClick={e => { e.preventDefault(); e.stopPropagation(); setOpen(o => !o); }}
        disabled={saving}
        className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-40"
        title="Change status"
      >
        {saving ? (
          <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden min-w-[130px]">
          {nextStatuses.map(s => {
            const label = allStatuses.find(opt => opt.value === s)?.label || s;
            return (
              <button
                key={s}
                onClick={e => { e.stopPropagation(); handleSelect(s); }}
                className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-2"
              >
                <StatusBadge status={s} size="sm" />
                <span className="text-muted-foreground">{label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OrdersPage() {
  const { admin } = useAdmin();
  const adminFetch = useAdminFetch();
  const params = useParams();
  const slug = params.slug as string;

  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [collection, setCollection] = useState<string>('orders');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  const loadOrders = useCallback(async () => {
    if (!admin) return;
    setLoading(true);
    const qp = new URLSearchParams({ page: String(page), limit: '20' });
    if (statusFilter !== 'all') qp.set('status', statusFilter);
    if (search.trim()) qp.set('search', search.trim());

    const data = await adminFetch(`/orders?${qp}`);
    if (data.success) {
      setItems(data.items || []);
      setCollection(data.collection || 'orders');
      setPagination(data.pagination || { total: 0, totalPages: 1 });
    }
    setLoading(false);
  }, [admin, adminFetch, page, statusFilter, search]);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  function handleStatusChanged(id: string | number, newStatus: string) {
    setItems(prev => prev.map(item => item.id === id ? { ...item, status: newStatus } : item));
  }

  const isBooking = collection === 'bookings';
  const statuses = withAllFilter(isBooking ? BOOKING_STATUSES : ORDER_STATUSES);

  return (
    <div className="space-y-4">
      <PageHeader
        title={isBooking ? 'Bookings' : 'Orders'}
        description={pagination.total > 0 ? `${pagination.total} total` : undefined}
      />

      {/* Search */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder={`Search ${isBooking ? 'bookings' : 'orders'}...`}
          className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-primary/40"
        />
      </div>

      {/* Status filter */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
        {statuses.map((s) => (
          <button
            key={s.value}
            onClick={() => { setStatusFilter(s.value); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              statusFilter === s.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-gray-100 dark:bg-gray-800 text-muted-foreground hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Orders list */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-16 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg mb-1">{isBooking ? 'No bookings' : 'No orders'} yet</p>
          <p className="text-sm">They will appear here when customers place them</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
          {items.map((item) => (
            <Link
              key={item.id}
              href={`/admin/${slug}/orders/${item.id}`}
              className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate">{item.customer_name}</p>
                  <StatusBadge status={item.status} size="sm" />
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  #{item.id}
                  {item.customer_phone && ` \u00B7 ${item.customer_phone}`}
                  {isBooking && item.date && ` \u00B7 ${item.date}`}
                </p>
              </div>
              <div className="flex items-center gap-2 ml-3 shrink-0">
                <div className="text-right">
                  {item.total !== undefined && (
                    <p className="text-sm font-medium">{item.total.toLocaleString()}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground">{new Date(item.created_at).toLocaleDateString()}</p>
                </div>
                <QuickStatusMenu
                  itemId={item.id}
                  currentStatus={item.status}
                  isBooking={isBooking}
                  onChanged={handleStatusChanged}
                />
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 text-xs rounded-lg bg-gray-100 dark:bg-gray-800 disabled:opacity-40"
          >
            Prev
          </button>
          <span className="text-xs text-muted-foreground">
            {page} / {pagination.totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
            disabled={page >= pagination.totalPages}
            className="px-3 py-1.5 text-xs rounded-lg bg-gray-100 dark:bg-gray-800 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
