/**
 * Telegram deep link utilities for the AI Assistant feature.
 *
 * Deep link format: https://t.me/{botUsername}?start={payload}
 * Payload format:   {tenantSlug}_{context}[_{targetId}]
 *
 * Telegram /start payload constraints:
 *   - Max 64 characters
 *   - Allowed chars: [A-Za-z0-9_-]
 */

export type AssistantContext =
  | 'home'
  | 'product'
  | 'service'
  | 'info_product'
  | 'catalog'
  | 'checkout'
  | 'order';

/**
 * Build a Telegram deep link that opens the tenant's AI assistant bot
 * with context about where the user came from.
 */
export function buildAssistantDeepLink(
  botUsername: string,
  tenantSlug: string,
  context: AssistantContext = 'home',
  targetId?: string,
): string {
  // Sanitize: only allow [A-Za-z0-9_-]
  const sanitize = (s: string) => s.replace(/[^A-Za-z0-9_-]/g, '');

  const parts = [sanitize(tenantSlug), sanitize(context)];
  if (targetId) parts.push(sanitize(targetId));

  let payload = parts.join('_');

  // Telegram limits payload to 64 chars
  if (payload.length > 64) {
    payload = payload.slice(0, 64);
  }

  return `https://t.me/${sanitize(botUsername)}?start=${payload}`;
}

/**
 * Parse a /start payload back into its components.
 * Used by the bot to understand the context.
 */
export function parseAssistantPayload(payload: string): {
  tenantSlug: string;
  context: AssistantContext;
  targetId?: string;
} {
  const parts = payload.split('_');

  // The first part is always the tenant slug.
  // However, slugs can contain hyphens — we need to figure out
  // where the slug ends and the context begins.
  const knownContexts: string[] = [
    'home', 'product', 'service', 'info', 'catalog', 'checkout', 'order',
  ];

  let contextIndex = -1;
  for (let i = 1; i < parts.length; i++) {
    if (knownContexts.includes(parts[i] as AssistantContext)) {
      contextIndex = i;
      break;
    }
    // Handle 'info_product' which spans two segments
    if (parts[i] === 'info' && parts[i + 1] === 'product') {
      contextIndex = i;
      break;
    }
  }

  if (contextIndex === -1) {
    return { tenantSlug: payload, context: 'home' };
  }

  const tenantSlug = parts.slice(0, contextIndex).join('_');

  let context: AssistantContext;
  let targetId: string | undefined;

  if (parts[contextIndex] === 'info' && parts[contextIndex + 1] === 'product') {
    context = 'info_product';
    targetId = parts.slice(contextIndex + 2).join('_') || undefined;
  } else {
    context = parts[contextIndex] as AssistantContext;
    targetId = parts.slice(contextIndex + 1).join('_') || undefined;
  }

  return { tenantSlug, context, targetId };
}
