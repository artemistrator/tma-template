import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createDirectus, rest, createItem, authentication } from '@directus/sdk';
import { createRateLimiter } from '@/lib/rate-limit';

const limiter = createRateLimiter({ limit: 5, windowMs: 60_000, prefix: 'leads' });

const DIRECTUS_URL = process.env.DIRECTUS_URL || process.env.NEXT_PUBLIC_DIRECTUS_URL || 'http://localhost:8055';
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_ADMIN_ID = process.env.TELEGRAM_ADMIN_ID;

async function getAdminClient() {
  const email = process.env.DIRECTUS_ADMIN_EMAIL;
  const password = process.env.DIRECTUS_ADMIN_PASSWORD;
  if (!email || !password) return createDirectus(DIRECTUS_URL).with(rest());
  const client = createDirectus(DIRECTUS_URL).with(authentication('json')).with(rest());
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (client as any).login(email, password);
  return client;
}

const CreateLeadSchema = z.object({
  tenantId: z.string().min(1),
  name: z.string().min(2),
  email: z.string().email().nullable().optional(),
  phone: z.string().nullable().optional(),
  source: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

/**
 * POST /api/leads
 * Saves lead to Directus `leads` collection + notifies admin via Telegram.
 */
export async function POST(request: NextRequest) {
  const blocked = limiter.check(request);
  if (blocked) return blocked;

  try {
    const body = await request.json();
    const validation = CreateLeadSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { tenantId, name, email, phone, source, notes } = validation.data;
    const client = await getAdminClient();

    const lead = await client.request(
      createItem('leads', {
        tenant_id: tenantId,
        name,
        email: email || null,
        phone: phone || null,
        source: source || 'direct',
        notes: notes || null,
      })
    );

    // Telegram notification (non-blocking)
    if (TELEGRAM_BOT_TOKEN && TELEGRAM_ADMIN_ID) {
      const text = [
        `👤 <b>New lead</b>`,
        ``,
        `<b>Name:</b> ${name}`,
        email ? `<b>Email:</b> ${email}` : null,
        phone ? `<b>Phone:</b> ${phone}` : null,
        source ? `<b>Source:</b> ${source}` : null,
        `<b>Tenant:</b> ${tenantId}`,
      ].filter(Boolean).join('\n');

      fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: TELEGRAM_ADMIN_ID, text, parse_mode: 'HTML' }),
      }).catch(e => console.error('[Leads] Telegram error:', e));
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return NextResponse.json({ success: true, id: (lead as any)?.id });
  } catch (error) {
    console.error('[Leads] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save lead', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
