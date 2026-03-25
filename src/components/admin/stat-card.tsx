import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon?: React.ReactNode;
  emphasis?: boolean;
  className?: string;
}

export function StatCard({ label, value, sub, icon, emphasis, className }: StatCardProps) {
  return (
    <div
      className={cn(
        'bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800',
        emphasis && 'border-primary/20 bg-primary/[0.02] dark:bg-primary/[0.04]',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <p className="text-xs text-muted-foreground">{label}</p>
        {icon && (
          <span className="text-muted-foreground/60">{icon}</span>
        )}
      </div>
      <p className={cn('font-semibold mt-1', emphasis ? 'text-3xl' : 'text-2xl')}>
        {value}
      </p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}
