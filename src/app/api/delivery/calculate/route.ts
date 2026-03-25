import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createRateLimiter } from '@/lib/rate-limit';
import { createCdekClient } from '@/lib/delivery/cdek';
import type { DeliveryOption, TenantDeliveryConfig } from '@/lib/delivery/types';
import { decryptConfigSecrets } from '@/lib/crypto';
import { alertApiError } from '@/lib/monitoring/alerts';

const limiter = createRateLimiter({ limit: 20, windowMs: 60_000, prefix: 'delivery-calc' });

const DIRECTUS_URL = process.env.DIRECTUS_URL || process.env.NEXT_PUBLIC_DIRECTUS_URL || 'http://localhost:8055';
const DIRECTUS_TOKEN = process.env.DIRECTUS_ADMIN_TOKEN || '';

const CalcSchema = z.object({
  tenantSlug: z.string().min(1),
  /** Cart total (for free delivery threshold) */
  cartTotal: z.number().min(0),
  /** Destination city name or postal code (for CDEK) */
  city: z.string().optional(),
  postalCode: z.string().optional(),
});

/**
 * POST /api/delivery/calculate
 *
 * Returns available delivery options with prices for a tenant.
 * Combines: pickup points, courier config, CDEK tariffs.
 */
export async function POST(request: NextRequest) {
  const blocked = limiter.check(request);
  if (blocked) return blocked;

  try {
    const body = await request.json();
    const validation = CalcSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: validation.error.issues },
        { status: 400 },
      );
    }

    const { tenantSlug, cartTotal, city, postalCode } = validation.data;

    // Get tenant delivery config
    const deliveryConfig = await getTenantDeliveryConfig(tenantSlug);
    if (!deliveryConfig || deliveryConfig.methods.length === 0) {
      return NextResponse.json({
        success: true,
        options: [],
        message: 'No delivery methods configured',
      });
    }

    const options: DeliveryOption[] = [];

    // Pickup points
    if (deliveryConfig.methods.includes('pickup') && deliveryConfig.pickupPoints?.length) {
      for (const point of deliveryConfig.pickupPoints) {
        options.push({
          id: `pickup_${point.id}`,
          type: 'pickup',
          name: point.name,
          description: point.address + (point.workingHours ? ` (${point.workingHours})` : ''),
          price: 0,
          pickupPoint: point,
        });
      }
    }

    // Courier
    if (deliveryConfig.methods.includes('courier') && deliveryConfig.courier) {
      const c = deliveryConfig.courier;
      const isFree = c.freeFrom > 0 && cartTotal >= c.freeFrom;
      const price = isFree ? 0 : c.price;

      const courierName = deliveryConfig.locale === 'ru' ? 'Курьерская доставка' : 'Courier Delivery';
      options.push({
        id: 'courier',
        type: 'courier',
        name: courierName,
        description: c.zone
          ? `${c.estimatedDays || c.estimatedTime || ''} ${c.zone ? '• ' + c.zone : ''}`.trim()
          : (c.estimatedDays || c.estimatedTime || ''),
        price,
        estimatedDays: c.estimatedTime,
      });
    }

    // CDEK
    if (deliveryConfig.methods.includes('cdek') && deliveryConfig.cdek) {
      const cdekOptions = await calculateCdek(deliveryConfig.cdek, city, postalCode);
      options.push(...cdekOptions);
    }

    return NextResponse.json({ success: true, options });
  } catch (error) {
    console.error('[Delivery] Calculate error:', error);
    alertApiError('/api/delivery/calculate', error);
    return NextResponse.json(
      { success: false, error: 'Failed to calculate delivery' },
      { status: 500 },
    );
  }
}

async function calculateCdek(
  config: NonNullable<TenantDeliveryConfig['cdek']>,
  city?: string,
  postalCode?: string,
): Promise<DeliveryOption[]> {
  const client = createCdekClient(config);

  // Find destination city code
  let toCityCode = 0;
  const query = postalCode || city;
  if (query) {
    const cities = await client.findCity(query);
    if (cities.length > 0) {
      toCityCode = cities[0].code;
    }
  }

  if (!toCityCode) {
    // Can't calculate without destination
    return [{
      id: 'cdek_placeholder',
      type: 'cdek',
      name: 'CDEK Delivery',
      description: 'Enter your city to see CDEK prices',
      price: 0,
    }];
  }

  const result = await client.calculateTariffs({
    fromCityCode: config.senderCityCode,
    toCityCode,
    packages: [{ weight: 1000 }], // Default 1kg package
    tariffCodes: config.tariffCodes,
  });

  if (result.error || result.tariffs.length === 0) {
    return [{
      id: 'cdek_unavailable',
      type: 'cdek',
      name: 'CDEK',
      description: result.error || 'CDEK delivery not available for this destination',
      price: 0,
    }];
  }

  return result.tariffs.map(t => ({
    id: `cdek_${t.tariff_code}`,
    type: 'cdek' as const,
    name: t.tariff_name,
    description: t.tariff_description,
    price: t.delivery_sum,
    estimatedDays: `${t.period_min}-${t.period_max} days`,
    cdekTariffCode: t.tariff_code,
  }));
}

async function getTenantDeliveryConfig(tenantSlug: string): Promise<(TenantDeliveryConfig & { locale?: string }) | null> {
  try {
    const res = await fetch(
      `${DIRECTUS_URL}/items/tenants?filter[slug][_eq]=${encodeURIComponent(tenantSlug)}&fields=config&limit=1`,
      {
        headers: { Authorization: `Bearer ${DIRECTUS_TOKEN}` },
        cache: 'no-store',
      },
    );
    const data = await res.json();
    const config = data.data?.[0]?.config;
    if (!config?.delivery) return null;
    // Decrypt secrets (CDEK clientSecret) before using
    const decrypted = decryptConfigSecrets(config);
    const delivery = decrypted.delivery as TenantDeliveryConfig;
    return { ...delivery, locale: config.locale } || null;
  } catch {
    return null;
  }
}
