import { NextRequest, NextResponse } from 'next/server';
import { createDirectus, rest, readItems, authentication } from '@directus/sdk';

const DIRECTUS_URL = process.env.DIRECTUS_URL || process.env.NEXT_PUBLIC_DIRECTUS_URL || 'http://localhost:8055';

async function getClient() {
  const email = process.env.DIRECTUS_ADMIN_EMAIL;
  const password = process.env.DIRECTUS_ADMIN_PASSWORD;
  if (email && password) {
    const client = createDirectus(DIRECTUS_URL).with(authentication('json')).with(rest());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (client as any).login(email, password);
    return client;
  }
  return createDirectus(DIRECTUS_URL).with(rest());
}

/**
 * GET /api/products/[id]/variants
 * Returns all variants for a product from product_variants collection.
 */
export async function GET(
  _req: NextRequest,
  context: { params: { id: string } | Promise<{ id: string }> }
) {
  const { id } = context.params instanceof Promise ? await context.params : context.params;

  try {
    const client = await getClient();
    const variants = await client.request(
      readItems('product_variants', {
        filter: { product_id: { _eq: id } },
        sort: ['type', 'name'],
      })
    );

    return NextResponse.json({ success: true, variants });
  } catch (error) {
    // Collection may not exist yet — return empty gracefully
    console.warn('[Variants API] Could not fetch variants:', error);
    return NextResponse.json({ success: true, variants: [] });
  }
}
