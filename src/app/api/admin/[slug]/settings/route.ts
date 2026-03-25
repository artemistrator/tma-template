import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/admin/auth';
import { DIRECTUS_URL } from '@/lib/orchestrator/admin-client';
import { encryptConfigSecrets, maskSecret } from '@/lib/crypto';

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

/**
 * GET /api/admin/[slug]/settings
 * Get tenant settings.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const auth = requireAdminAuth(request, slug);
  if ('error' in auth) return auth.error;

  try {
    const tenantData = await directusFetch(
      `/items/tenants?filter[slug][_eq]=${encodeURIComponent(slug)}&fields=id,name,slug,config&limit=1`
    );
    const tenant = (tenantData.data || [])[0];
    if (!tenant) {
      return NextResponse.json({ success: false, error: 'Tenant not found' }, { status: 404 });
    }

    // Mask secrets before sending to frontend
    if (tenant.config) {
      const cfg = tenant.config as Record<string, unknown>;
      const payments = cfg.payments as Record<string, unknown> | undefined;
      if (payments?.yookassa) {
        const yk = payments.yookassa as Record<string, unknown>;
        if (yk.secretKey && typeof yk.secretKey === 'string') {
          yk.secretKey = maskSecret(yk.secretKey);
        }
      }
      const delivery = cfg.delivery as Record<string, unknown> | undefined;
      if (delivery?.cdek) {
        const cdek = delivery.cdek as Record<string, unknown>;
        if (cdek.clientSecret && typeof cdek.clientSecret === 'string') {
          cdek.clientSecret = maskSecret(cdek.clientSecret);
        }
      }
    }

    return NextResponse.json({ success: true, tenant });
  } catch (error) {
    console.error('[Admin Settings] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load settings' },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/admin/[slug]/settings
 * Update tenant settings (name, config fields).
 * Only owner can update settings.
 *
 * Body: { name?, config?: { phone?, address?, theme?, marketing? } }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const auth = requireAdminAuth(request, slug);
  if ('error' in auth) return auth.error;

  // Only owner can change settings
  if (auth.session.role !== 'owner') {
    return NextResponse.json(
      { success: false, error: 'Only the owner can update settings' },
      { status: 403 },
    );
  }

  try {
    const body = await request.json();

    // Get current tenant
    const tenantData = await directusFetch(
      `/items/tenants?filter[slug][_eq]=${encodeURIComponent(slug)}&fields=id,config&limit=1`
    );
    const tenant = (tenantData.data || [])[0];
    if (!tenant) {
      return NextResponse.json({ success: false, error: 'Tenant not found' }, { status: 404 });
    }

    const updates: Record<string, unknown> = {};

    // Allow updating name
    if (body.name && typeof body.name === 'string') {
      updates.name = body.name;
    }

    // Merge config changes
    if (body.config && typeof body.config === 'object') {
      const existingConfig = (tenant.config || {}) as Record<string, unknown>;
      // Only allow safe config fields
      const allowedFields = ['phone', 'address', 'theme', 'currency', 'locale', 'marketing', 'payments', 'delivery', 'features'];
      const configUpdate: Record<string, unknown> = { ...existingConfig };

      for (const field of allowedFields) {
        if (field in body.config) {
          configUpdate[field] = body.config[field];
        }
      }

      // Deep-merge features so updating reviews doesn't overwrite other feature flags
      if (body.config.features && typeof body.config.features === 'object') {
        const existingFeatures = (existingConfig.features || {}) as Record<string, unknown>;
        configUpdate.features = { ...existingFeatures, ...body.config.features };
      }

      // Deep-merge delivery so updating courier/cdek doesn't overwrite pickupPoints etc.
      if (body.config.delivery && typeof body.config.delivery === 'object') {
        const existingDelivery = (existingConfig.delivery || {}) as Record<string, unknown>;
        configUpdate.delivery = { ...existingDelivery, ...body.config.delivery };
      }

      // Handle secrets: if admin sent a masked value (contains "..."), keep existing encrypted value
      const existingPayments = existingConfig.payments as Record<string, unknown> | undefined;
      const existingDelivery = existingConfig.delivery as Record<string, unknown> | undefined;

      const newPayments = configUpdate.payments as Record<string, unknown> | undefined;
      if (newPayments?.yookassa) {
        const yk = newPayments.yookassa as Record<string, unknown>;
        if (typeof yk.secretKey === 'string' && yk.secretKey.includes('...')) {
          // Masked value — keep existing encrypted value
          const existYk = existingPayments?.yookassa as Record<string, unknown> | undefined;
          yk.secretKey = existYk?.secretKey || '';
        }
      }

      const newDelivery = configUpdate.delivery as Record<string, unknown> | undefined;
      if (newDelivery?.cdek) {
        const cdek = newDelivery.cdek as Record<string, unknown>;
        if (typeof cdek.clientSecret === 'string' && cdek.clientSecret.includes('...')) {
          const existCdek = existingDelivery?.cdek as Record<string, unknown> | undefined;
          cdek.clientSecret = existCdek?.clientSecret || '';
        }
      }

      // Encrypt new plaintext secrets before saving
      encryptConfigSecrets(configUpdate);

      updates.config = configUpdate;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid fields to update' },
        { status: 400 },
      );
    }

    await directusFetch(`/items/tenants/${tenant.id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });

    console.log(`[Admin] Settings updated for tenant ${slug}:`, Object.keys(updates));

    return NextResponse.json({ success: true, updated: Object.keys(updates) });
  } catch (error) {
    console.error('[Admin Settings Update] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update settings' },
      { status: 500 },
    );
  }
}
