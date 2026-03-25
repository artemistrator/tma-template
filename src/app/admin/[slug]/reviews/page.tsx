'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAdmin, useAdminFetch } from '@/lib/admin/admin-context';
import { useParams } from 'next/navigation';
import { PageHeader } from '@/components/admin/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/admin/toast';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import {
  REVIEW_STATUSES,
  withAllFilter,
} from '@/components/admin/status-config';

interface ReviewItem {
  id: string | number;
  author_name: string;
  rating: number;
  text: string;
  target_type?: string;
  target_id?: string | null;
  status: string;
  moderation_note?: string | null;
  created_at: string;
  approved_at?: string | null;
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <span key={star} className={star <= rating ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'}>
          &#9733;
        </span>
      ))}
    </span>
  );
}

export default function ReviewsPage() {
  const { admin } = useAdmin();
  const adminFetch = useAdminFetch();
  const params = useParams();
  const slug = params.slug as string;
  const { showToast } = useToast();

  const [items, setItems] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [actionLoading, setActionLoading] = useState<string | number | null>(null);

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<string | number | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const loadReviews = useCallback(async () => {
    if (!admin) return;
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (statusFilter !== 'all') params.set('status', statusFilter);

    const data = await adminFetch(`/reviews?${params}`);
    if (data.success) {
      setItems(data.items || []);
      setPagination(data.pagination || { total: 0, totalPages: 1 });
    }
    setLoading(false);
  }, [admin, adminFetch, page, statusFilter]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  async function handleModerate(id: string | number, newStatus: 'approved' | 'rejected') {
    setActionLoading(id);
    try {
      const data = await adminFetch(`/reviews/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      if (data.success) {
        if (statusFilter !== 'all' && newStatus !== statusFilter) {
          setItems(prev => prev.filter(item => item.id !== id));
          setPagination(prev => ({ ...prev, total: Math.max(0, prev.total - 1) }));
        } else {
          setItems(prev => prev.map(item =>
            item.id === id ? { ...item, status: newStatus } : item
          ));
        }
        showToast(`Review ${newStatus}`, 'success');
      } else {
        showToast(data.error || 'Failed to moderate review', 'error');
      }
    } catch {
      showToast('Network error while moderating review', 'error');
    }
    setActionLoading(null);
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const data = await adminFetch(`/reviews/${deleteTarget}`, { method: 'DELETE' });
      if (data.success) {
        setItems(prev => prev.filter(item => item.id !== deleteTarget));
        setPagination(prev => ({ ...prev, total: Math.max(0, prev.total - 1) }));
        showToast('Review deleted', 'success');
      } else {
        showToast('Failed to delete review', 'error');
      }
    } catch {
      showToast('Network error', 'error');
    }
    setDeleteLoading(false);
    setDeleteTarget(null);
  }

  const targetLabel = (type?: string, id?: string | null) => {
    if (!type || type === 'business') return 'Business';
    const typeMap: Record<string, string> = {
      product: 'Product',
      service: 'Service',
      info_product: 'Info Product',
    };
    return `${typeMap[type] || type} #${id || '?'}`;
  };

  const statuses = withAllFilter(REVIEW_STATUSES);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Reviews"
        description={pagination.total > 0 ? `${pagination.total} total` : undefined}
      />

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

      {/* Reviews list */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-24 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg mb-1">No reviews</p>
          <p className="text-sm">
            {statusFilter === 'pending'
              ? 'No reviews awaiting moderation'
              : 'No reviews match this filter'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary shrink-0">
                    {item.author_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{item.author_name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Stars rating={item.rating} />
                      <span>{targetLabel(item.target_type, item.target_id)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <StatusBadge status={item.status} size="sm" />
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(item.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Text */}
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-3 whitespace-pre-line">
                {item.text}
              </p>

              {/* Actions */}
              <div className="flex items-center gap-2">
                {(item.status === 'pending' || item.status === 'rejected') && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleModerate(item.id, 'approved')}
                    loading={actionLoading === item.id}
                    className="text-success-foreground border-success/30 hover:bg-success-bg"
                  >
                    Approve
                  </Button>
                )}
                {(item.status === 'pending' || item.status === 'approved') && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleModerate(item.id, 'rejected')}
                    loading={actionLoading === item.id}
                    className="text-error-foreground border-error/30 hover:bg-error-bg"
                  >
                    Reject
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setDeleteTarget(item.id)}
                  disabled={actionLoading === item.id}
                  className="ml-auto text-muted-foreground hover:text-destructive"
                >
                  Delete
                </Button>
              </div>
            </div>
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

      {/* Delete confirmation */}
      <ConfirmDialog
        open={deleteTarget !== null}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
        title="Delete review"
        description="This review will be permanently deleted. This action cannot be undone."
        confirmText="Delete"
        variant="destructive"
        loading={deleteLoading}
      />
    </div>
  );
}
