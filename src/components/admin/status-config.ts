/**
 * Single source of truth for status presentation across all admin pages.
 * Works with the shared StatusBadge component from @/components/ui/status-badge.
 *
 * Usage: import { ORDER_STATUSES, BOOKING_STATUSES, REVIEW_STATUSES } from '@/components/admin/status-config';
 */

export interface StatusOption {
  value: string;
  label: string;
}

// --- Order statuses ---
export const ORDER_STATUSES: StatusOption[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'processing', label: 'Processing' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

export const ORDER_TRANSITIONS: Record<string, string[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
};

// --- Booking statuses ---
export const BOOKING_STATUSES: StatusOption[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export const BOOKING_TRANSITIONS: Record<string, string[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['cancelled'],
  cancelled: [],
};

// --- Review statuses ---
export const REVIEW_STATUSES: StatusOption[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

// --- Product / service statuses ---
export const PRODUCT_STATUSES: StatusOption[] = [
  { value: 'published', label: 'Published' },
  { value: 'draft', label: 'Draft' },
  { value: 'archived', label: 'Archived' },
];

export const SERVICE_STATUSES: StatusOption[] = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

// Helper: get filter options with "All" prepended
export function withAllFilter(statuses: StatusOption[]): StatusOption[] {
  return [{ value: 'all', label: 'All' }, ...statuses];
}
