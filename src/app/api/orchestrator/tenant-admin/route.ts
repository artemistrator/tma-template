import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireOrchestratorAuth } from '@/lib/orchestrator/auth';
import { DIRECTUS_URL } from '@/lib/orchestrator/admin-client';
import crypto from 'crypto';

const DIRECTUS_TOKEN = () => process.env.DIRECTUS_ADMIN_TOKEN || '';

async function directusFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${DIRECTUS_URL}${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${DIRECTUS_TOKEN()}`,
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    cache: 'no-store',
  });
  return res.json();
}

const AddAdminSchema = z.object({
  tenantSlug: z.string().min(1),
  telegramId: z.number().int().positive(),
  name: z.string().min(1),
  role: z.enum(['owner', 'manager']).default('owner'),
});

/**
 * POST /api/orchestrator/tenant-admin
 * Add an admin user for a tenant.
 * Called during pipeline execution or manually.
 */
export async function POST(request: NextRequest) {
  const authError = requireOrchestratorAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const validation = AddAdminSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: validation.error.issues },
        { status: 400 },
      );
    }

    const { tenantSlug, telegramId, name, role } = validation.data;

    // Check if admin already exists for this tenant + telegram_id
    const existing = await directusFetch(
      `/items/tenant_admins?filter[tenant_id][_eq]=${encodeURIComponent(tenantSlug)}&filter[telegram_id][_eq]=${telegramId}&limit=1`
    );

    if (existing.data && existing.data.length > 0) {
      const admin = existing.data[0];
      return NextResponse.json({
        success: true,
        adminId: admin.id,
        adminToken: admin.admin_token,
        message: 'Admin already exists',
      });
    }

    // Create admin record
    const adminToken = crypto.randomUUID();
    const result = await directusFetch('/items/tenant_admins', {
      method: 'POST',
      body: JSON.stringify({
        tenant_id: tenantSlug,
        telegram_id: telegramId,
        admin_token: adminToken,
        role,
        name,
      }),
    });

    if (!result.data) {
      return NextResponse.json(
        { success: false, error: 'Failed to create admin', details: result.errors },
        { status: 500 },
      );
    }

    console.log(`[Orchestrator] Admin added for "${tenantSlug}": ${name} (${role}, tg:${telegramId})`);

    // Send admin link via Telegram bot
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || `http://localhost:${process.env.PORT || 3000}`;

    if (botToken) {
      const adminUrl = `${appUrl}/admin/${tenantSlug}`;
      const message = [
        `Your admin panel is ready!`,
        ``,
        `Business: ${tenantSlug}`,
        `Role: ${role}`,
        ``,
        `Admin panel: ${adminUrl}`,
        `Admin token: <code>${adminToken}</code>`,
        ``,
        `Open the link above to manage your business. Use the token to log in from desktop.`,
      ].join('\n');

      try {
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: telegramId,
            text: message,
            parse_mode: 'HTML',
          }),
        });
        console.log(`[Orchestrator] Admin link sent to Telegram user ${telegramId}`);
      } catch (err) {
        console.warn('[Orchestrator] Failed to send admin link via Telegram:', err);
      }
    }

    return NextResponse.json({
      success: true,
      adminId: result.data.id,
      adminToken,
      adminUrl: `${appUrl}/admin/${tenantSlug}`,
    });
  } catch (error) {
    console.error('[Orchestrator] Add admin error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to add admin', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
