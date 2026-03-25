import { NextRequest, NextResponse } from 'next/server';
import {
  getTenantBySlug,
  getProductsByTenant,
  getServicesByTenant,
  getInfoProductsByTenant,
  getStaffByTenant,
  getWorkingHoursByTenant,
  getReviewSummary,
} from '@/lib/directus';

export const dynamic = 'force-dynamic';

/**
 * In-memory cache for knowledge base responses.
 * TTL: 5 minutes — tenant data changes infrequently.
 */
const cache = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000;

/**
 * GET /api/assistant/knowledge?tenant=slug
 *
 * Returns a structured knowledge base for the AI assistant bot.
 * Includes: tenant info, catalog, contacts, delivery, FAQ, reviews summary.
 *
 * Authentication: API key via X-Bot-Token header (must match tenant's bot token)
 * or internal usage without auth for same-origin requests.
 */
export async function GET(request: NextRequest) {
  const tenantSlug = request.nextUrl.searchParams.get('tenant');
  if (!tenantSlug) {
    return NextResponse.json({ error: 'Missing tenant parameter' }, { status: 400 });
  }

  // Check cache
  const cached = cache.get(tenantSlug);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return NextResponse.json(cached.data, {
      headers: { 'X-Cache': 'HIT' },
    });
  }

  try {
    const tenant = await getTenantBySlug(tenantSlug);
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const config = (tenant.config || {}) as Record<string, unknown>;
    const businessType = (config.businessType as string) || 'ecommerce';
    const isBooking = businessType === 'booking';
    const isInfobiz = businessType === 'infobiz';

    // Fetch relevant data based on business type
    const [products, services, infoProducts, staff, workingHours, reviewsSummary] =
      await Promise.all([
        !isBooking && !isInfobiz ? getProductsByTenant(tenantSlug) : Promise.resolve([]),
        isBooking ? getServicesByTenant(tenantSlug) : Promise.resolve([]),
        isInfobiz ? getInfoProductsByTenant(tenantSlug) : Promise.resolve([]),
        isBooking ? getStaffByTenant(tenantSlug) : Promise.resolve([]),
        isBooking ? getWorkingHoursByTenant(tenantSlug) : Promise.resolve([]),
        getReviewSummary(tenantSlug).catch(() => null),
      ]);

    // Build knowledge base
    const knowledge: Record<string, unknown> = {
      business: {
        name: tenant.name,
        type: businessType,
        slug: tenant.slug,
        locale: config.locale || 'en',
        currency: config.currency || 'USD',
      },
    };

    // Contacts
    const contacts = config.contacts as Record<string, unknown> | undefined;
    const phone = (config.phone as string) || contacts?.phone;
    const address = (config.address as string) || contacts?.address;
    if (phone || address || contacts?.telegram || contacts?.whatsapp) {
      knowledge.contacts = {
        phone: phone || undefined,
        address: address || undefined,
        telegram: contacts?.telegram || undefined,
        whatsapp: contacts?.whatsapp || undefined,
      };
    }

    // FAQ
    const marketing = config.marketing as Record<string, unknown> | undefined;
    if (marketing?.faq && Array.isArray(marketing.faq) && marketing.faq.length > 0) {
      knowledge.faq = marketing.faq;
    }

    // Catalog — products/services/info_products (limited info for the bot)
    if (products.length > 0) {
      knowledge.catalog = {
        type: 'products',
        count: products.length,
        items: products
          .filter(p => p.status === 'published')
          .map(p => ({
            id: p.id,
            name: p.name,
            price: p.price,
            category: p.category || undefined,
            description: p.description?.slice(0, 200) || undefined,
            inStock: p.stock_quantity === null || p.stock_quantity === undefined || p.stock_quantity === -1 || p.stock_quantity > 0,
          })),
      };
    }

    if (services.length > 0) {
      knowledge.catalog = {
        type: 'services',
        count: services.length,
        items: services
          .filter(s => s.status === 'active')
          .map(s => ({
            id: s.id,
            name: s.name,
            price: s.price,
            duration: s.duration || undefined,
            category: s.category || undefined,
            description: s.description?.slice(0, 200) || undefined,
          })),
      };
    }

    if (infoProducts.length > 0) {
      knowledge.catalog = {
        type: 'info_products',
        count: infoProducts.length,
        items: infoProducts
          .filter(p => p.status === 'published')
          .map(p => ({
            id: p.id,
            name: p.name,
            type: p.type,
            price: p.price,
            description: p.description?.slice(0, 200) || undefined,
          })),
      };
    }

    // Staff (booking)
    if (staff.length > 0) {
      knowledge.staff = staff.map(s => ({
        id: s.id,
        name: s.name,
        bio: s.bio?.slice(0, 200) || undefined,
      }));
    }

    // Working hours (booking)
    if (workingHours.length > 0) {
      knowledge.workingHours = workingHours.map(wh => ({
        dayOfWeek: wh.day_of_week,
        start: wh.start_time,
        end: wh.end_time,
        isOff: wh.is_day_off,
      }));
    }

    // Delivery info (ecommerce)
    const delivery = config.delivery as Record<string, unknown> | undefined;
    if (delivery?.methods) {
      knowledge.delivery = {
        methods: delivery.methods,
        courier: delivery.courier || undefined,
      };
    }

    // Payment methods
    const payments = config.payments as Record<string, unknown> | undefined;
    if (payments?.methods) {
      knowledge.payments = {
        methods: payments.methods,
      };
    }

    // Reviews summary
    if (reviewsSummary && reviewsSummary.totalReviews > 0) {
      knowledge.reviews = {
        averageRating: reviewsSummary.averageRating,
        totalReviews: reviewsSummary.totalReviews,
      };
    }

    // Custom knowledge from assistant config
    const features = config.features as Record<string, unknown> | undefined;
    const assistantCfg = features?.assistant as Record<string, unknown> | undefined;
    const knowledgeBase = assistantCfg?.knowledgeBase as Record<string, unknown> | undefined;
    if (knowledgeBase?.custom && typeof knowledgeBase.custom === 'string') {
      knowledge.customInstructions = knowledgeBase.custom;
    }

    // Mini app URL for back-links
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL;
    if (appUrl) {
      knowledge.miniAppUrl = `${appUrl.startsWith('http') ? appUrl : `https://${appUrl}`}/?tenant=${tenantSlug}`;
    }

    const response = { success: true, knowledge };

    // Store in cache
    cache.set(tenantSlug, { data: response, ts: Date.now() });

    return NextResponse.json(response, {
      headers: { 'X-Cache': 'MISS' },
    });
  } catch (error) {
    console.error('[Assistant Knowledge] Error:', error);
    return NextResponse.json(
      { error: 'Failed to build knowledge base' },
      { status: 500 },
    );
  }
}
