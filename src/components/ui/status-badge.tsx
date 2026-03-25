import { cn } from "@/lib/utils"

type StatusVariant = 'success' | 'warning' | 'info' | 'error' | 'muted';

const STATUS_MAP: Record<string, StatusVariant> = {
  // Warning
  pending: 'warning',
  waiting: 'warning',
  waiting_for_capture: 'warning',
  // Info
  confirmed: 'info',
  approved: 'info',
  active: 'info',
  published: 'info',
  processing: 'info',
  shipped: 'info',
  // Success
  delivered: 'success',
  completed: 'success',
  paid: 'success',
  // Error
  cancelled: 'error',
  rejected: 'error',
  failed: 'error',
  refunded: 'error',
  // Muted
  draft: 'muted',
  archived: 'muted',
  inactive: 'muted',
};

const VARIANT_STYLES: Record<StatusVariant, string> = {
  success: 'bg-success-bg text-success-foreground',
  warning: 'bg-warning-bg text-warning-foreground',
  info: 'bg-info-bg text-info-foreground',
  error: 'bg-error-bg text-error-foreground',
  muted: 'bg-muted text-muted-foreground',
};

const DOT_STYLES: Record<StatusVariant, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  info: 'bg-info',
  error: 'bg-error',
  muted: 'bg-muted-foreground',
};

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'default';
  label?: string;
  className?: string;
}

export function StatusBadge({ status, size = 'default', label, className }: StatusBadgeProps) {
  const normalized = status.toLowerCase().replace(/[\s-]/g, '_');
  const variant = STATUS_MAP[normalized] || 'muted';

  const displayLabel = label || status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ');

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs',
        VARIANT_STYLES[variant],
        className
      )}
    >
      <span
        className={cn(
          'rounded-full shrink-0',
          size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2',
          DOT_STYLES[variant]
        )}
      />
      {displayLabel}
    </span>
  );
}
