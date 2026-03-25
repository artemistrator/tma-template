/**
 * Centralized Telegram alerting for platform monitoring.
 *
 * Sends alerts to TELEGRAM_ADMIN_ID via TELEGRAM_BOT_TOKEN.
 * All alerts are non-blocking (fire-and-forget with error logging).
 * Includes deduplication to avoid alert storms.
 */

const TELEGRAM_BOT_TOKEN = () => process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_ADMIN_ID = () => process.env.TELEGRAM_ADMIN_ID || '';

export type AlertLevel = 'critical' | 'warning' | 'info' | 'recovery';

const LEVEL_EMOJI: Record<AlertLevel, string> = {
  critical: '\u{1F534}',  // red circle
  warning: '\u{1F7E1}',   // yellow circle
  info: '\u{1F535}',      // blue circle
  recovery: '\u{1F7E2}',  // green circle
};

// ── Deduplication ──────────────────────────────────────────
// Prevent alert storms: same alert key won't fire more than once per interval
const recentAlerts = new Map<string, number>();
const DEDUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

function isDuplicate(key: string): boolean {
  const now = Date.now();
  const lastSent = recentAlerts.get(key);
  if (lastSent && now - lastSent < DEDUP_INTERVAL_MS) {
    return true;
  }
  recentAlerts.set(key, now);
  // Cleanup old entries periodically
  if (recentAlerts.size > 100) {
    const keysToDelete: string[] = [];
    recentAlerts.forEach((v, k) => {
      if (now - v > DEDUP_INTERVAL_MS) keysToDelete.push(k);
    });
    keysToDelete.forEach(k => recentAlerts.delete(k));
  }
  return false;
}

// ── Core alert function ────────────────────────────────────

interface AlertOptions {
  level: AlertLevel;
  title: string;
  message: string;
  /** Dedup key — same key won't fire twice within 5 minutes */
  dedupKey?: string;
  /** Extra context fields (key: value) */
  context?: Record<string, string>;
}

export async function sendAlert(options: AlertOptions): Promise<void> {
  const token = TELEGRAM_BOT_TOKEN();
  const adminId = TELEGRAM_ADMIN_ID();
  if (!token || !adminId) return;

  const { level, title, message, dedupKey, context } = options;

  // Deduplication check
  if (dedupKey && isDuplicate(dedupKey)) {
    return;
  }

  const emoji = LEVEL_EMOJI[level];
  const lines = [
    `${emoji} <b>${title}</b>`,
    '',
    message,
  ];

  if (context && Object.keys(context).length > 0) {
    lines.push('');
    for (const [key, value] of Object.entries(context)) {
      lines.push(`<b>${key}:</b> ${value}`);
    }
  }

  lines.push('', `<i>${new Date().toISOString()}</i>`);

  const text = lines.join('\n');

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: adminId,
        text,
        parse_mode: 'HTML',
      }),
    });
  } catch (error) {
    console.error('[Alerts] Failed to send Telegram alert:', error);
  }
}

// ── Convenience wrappers ───────────────────────────────────

/**
 * Alert: API route returned 500 error.
 */
export function alertApiError(route: string, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  sendAlert({
    level: 'critical',
    title: 'API Error',
    message: `Route <code>${route}</code> returned 500`,
    dedupKey: `api-error:${route}`,
    context: {
      'Error': message.slice(0, 200),
    },
  }).catch(() => {});
}

/**
 * Alert: Payment failed or was canceled.
 */
export function alertPaymentFailed(orderId: string, tenantSlug: string, reason: string, amount?: string): void {
  sendAlert({
    level: 'warning',
    title: 'Payment Failed',
    message: `Order <code>${orderId}</code> payment was not completed`,
    dedupKey: `payment-fail:${orderId}`,
    context: {
      'Tenant': tenantSlug,
      'Reason': reason,
      ...(amount ? { 'Amount': amount } : {}),
    },
  }).catch(() => {});
}

/**
 * Alert: Health check detected a problem.
 */
export function alertHealthCheckFailed(service: string, details: string): void {
  sendAlert({
    level: 'critical',
    title: 'Health Check Failed',
    message: `Service <b>${service}</b> is not responding`,
    dedupKey: `health:${service}`,
    context: {
      'Details': details.slice(0, 200),
    },
  }).catch(() => {});
}

/**
 * Alert: Service recovered after a failure.
 */
export function alertRecovery(service: string): void {
  sendAlert({
    level: 'recovery',
    title: 'Service Recovered',
    message: `<b>${service}</b> is back online`,
    dedupKey: `recovery:${service}`,
  }).catch(() => {});
}

/**
 * Alert: Stock is running low for a product.
 */
export function alertLowStock(tenantSlug: string, productName: string, remaining: number): void {
  sendAlert({
    level: 'warning',
    title: 'Low Stock',
    message: `Product "${productName}" has only <b>${remaining}</b> items left`,
    dedupKey: `low-stock:${tenantSlug}:${productName}`,
    context: {
      'Tenant': tenantSlug,
    },
  }).catch(() => {});
}
