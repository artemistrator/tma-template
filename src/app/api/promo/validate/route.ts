import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const DIRECTUS_URL = process.env.DIRECTUS_URL || process.env.NEXT_PUBLIC_DIRECTUS_URL || 'http://localhost:8055';

const ValidatePromoSchema = z.object({
  code: z.string().min(1),
  tenantId: z.string().min(1),
  orderTotal: z.number().positive(),
});

/**
 * POST /api/promo/validate
 * Validates a promo code against the promo_codes Directus collection.
 * Returns discount amount if valid.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = ValidatePromoSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { valid: false, error: 'Invalid request' },
        { status: 400 }
      );
    }

    const { code, tenantId, orderTotal } = validation.data;

    // Look up promo code in Directus via direct fetch
    let promo: Record<string, unknown> | null = null;
    try {
      const res = await fetch(
        `${DIRECTUS_URL}/items/promo_codes?filter[code][_eq]=${encodeURIComponent(code.toUpperCase())}&filter[tenant_id][_eq]=${encodeURIComponent(tenantId)}&filter[status][_eq]=active&limit=1`
      );
      if (!res.ok) {
        return NextResponse.json({ valid: false, error: 'Promo codes not configured' });
      }
      const json = await res.json() as { data?: Record<string, unknown>[] };
      promo = json.data?.[0] ?? null;
    } catch {
      return NextResponse.json({ valid: false, error: 'Promo codes not configured' });
    }

    if (!promo) {
      return NextResponse.json({ valid: false, error: 'Invalid promo code' });
    }

    // Check expiry
    if (promo.expires_at) {
      const expiry = new Date(promo.expires_at as string);
      if (expiry < new Date()) {
        return NextResponse.json({ valid: false, error: 'Promo code has expired' });
      }
    }

    // Check usage limit
    const maxUses = (promo.max_uses as number) || 0;
    const usedCount = (promo.used_count as number) || 0;
    if (maxUses > 0 && usedCount >= maxUses) {
      return NextResponse.json({ valid: false, error: 'Promo code usage limit reached' });
    }

    // Check minimum order amount
    const minOrder = (promo.min_order_amount as number) || 0;
    if (orderTotal < minOrder) {
      return NextResponse.json({
        valid: false,
        error: `Minimum order amount for this code is $${minOrder.toFixed(2)}`,
      });
    }

    // Calculate discount
    const discountType = promo.discount_type as string;
    const discountValue = promo.discount_value as number;
    let discountAmount: number;

    if (discountType === 'percent') {
      discountAmount = Math.round((orderTotal * discountValue) / 100 * 100) / 100;
    } else {
      discountAmount = Math.min(discountValue, orderTotal);
    }

    // Increment used_count (best-effort — don't fail if this fails)
    try {
      await fetch(`${DIRECTUS_URL}/items/promo_codes/${promo.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ used_count: usedCount + 1 }),
      });
    } catch (e) {
      console.warn('[Promo] Could not increment used_count:', e);
    }

    return NextResponse.json({
      valid: true,
      discountType,
      discountValue,
      discountAmount,
      code: code.toUpperCase(),
    });
  } catch (error) {
    console.error('[Promo] Error:', error);
    return NextResponse.json(
      { valid: false, error: 'Failed to validate promo code' },
      { status: 500 }
    );
  }
}
