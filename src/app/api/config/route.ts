import { NextRequest, NextResponse } from 'next/server';
import { getTenantBySlug, getProductsByTenant, getServicesByTenant, getInfoProductsByTenant, getStaffByTenant, getWorkingHoursByTenant, type InfoProduct, type Staff, type WorkingHours } from '@/lib/directus';
import { validateMiniAppSchema, type MiniAppSchemaType, type ComponentInstance } from '@/lib/schema/mini-app-schema';
import { alertApiError } from '@/lib/monitoring/alerts';
import fs from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';

/**
 * Extract frontend-safe feature flags from tenant config.
 * Never exposes secrets (e.g. botToken).
 */
function extractFeatures(tenantConfig: Record<string, unknown> | undefined) {
  if (!tenantConfig) return undefined;
  const features = tenantConfig.features as Record<string, unknown> | undefined;
  if (!features) return undefined;

  const result: Record<string, unknown> = {};

  // Reviews feature flags
  const reviews = features.reviews as Record<string, boolean> | undefined;
  if (reviews?.enabled) {
    result.reviews = {
      enabled: true,
      businessReviews: !!reviews.businessReviews,
      productReviews: !!reviews.productReviews,
      allowSubmission: !!reviews.allowSubmission,
      moderation: !!reviews.moderation,
    };
  }

  // Assistant feature flags (strip botToken — never send to frontend)
  const assistant = features.assistant as Record<string, unknown> | undefined;
  if (assistant?.enabled && assistant?.botUsername) {
    result.assistant = {
      enabled: true,
      mode: assistant.mode || 'telegram_bot',
      botUsername: assistant.botUsername,
      entryCta: assistant.entryCta || undefined,
      placement: assistant.placement || 'floating',
    };
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

function toAssetUrl(uuid: string | null | undefined): string | undefined {
  if (!uuid) return undefined;
  // Already a full URL (external CDN or absolute) — use as-is
  if (uuid.startsWith('http://') || uuid.startsWith('https://') || uuid.startsWith('/')) {
    return uuid;
  }
  // Directus asset UUID — proxy through Next.js API to avoid hostname/auth issues
  return `/api/assets/${uuid}`;
}

/**
 * GET /api/config
 * 
 * Returns app configuration based on tenant slug from Directus.
 * 
 * Query Params:
 *  - tenant: Tenant slug (e.g., 'pizza', 'barber')
 * 
 * Response:
 *  - success: boolean
 *  - config: MiniAppSchemaType
 *  - error: string (if not found)
 */
export async function GET(request: NextRequest) {
  try {
    // Get tenant slug: subdomain header (from middleware) → query param → default
    const tenantSlug = request.headers.get('x-tenant-slug')
      || request.nextUrl.searchParams.get('tenant')
      || 'pizza';

    console.log(`[Config API] Request received for tenant slug: ${tenantSlug}`);

    // Check for a direct config first (bypasses Directus)
    const directConfig = await loadDirectConfig(tenantSlug);
    if (directConfig) {
      console.log(`[Config API] Serving direct config for "${tenantSlug}"`);
      return NextResponse.json({
        success: true,
        config: directConfig,
        tenantSlug,
        tenantId: directConfig.meta.tenantId || 'direct',
        source: 'direct',
        timestamp: new Date().toISOString(),
      });
    }

    // Fetch tenant from Directus
    const tenant = await getTenantBySlug(tenantSlug);
    
    if (!tenant) {
      console.warn(`[Config API] Tenant not found: ${tenantSlug}`);
      return NextResponse.json(
        {
          success: false,
          error: 'Tenant not found',
          message: `No configuration found for tenant '${tenantSlug}'`,
        },
        { status: 404 }
      );
    }

    console.log(`[Config API] Tenant found: ${tenant.name}`);

    // Fetch products or services based on business type
    const isBooking = tenant.config?.businessType === 'booking';
    const isInfobiz = tenant.config?.businessType === 'infobiz';
    const products = (!isBooking && !isInfobiz) ? await getProductsByTenant(tenant.slug) : [];
    const services = isBooking ? await getServicesByTenant(tenant.slug) : [];
    const infoProducts = isInfobiz ? await getInfoProductsByTenant(tenant.slug) : [];
    const staff = isBooking ? await getStaffByTenant(tenant.slug) : [];
    const workingHours = isBooking ? await getWorkingHoursByTenant(tenant.slug) : [];

    console.log(`[Config API] Products: ${products.length}, Services: ${services.length}, InfoProducts: ${infoProducts.length}, WorkingHours: ${workingHours.length}`);

    // Build config from Directus data
    const config: MiniAppSchemaType = buildConfigFromDirectus(tenant, products, services, infoProducts, staff, workingHours);

    // Validate config before returning
    const validation = validateMiniAppSchema(config);
    if (!validation.success) {
      console.error('[Config API] Schema validation failed:', validation.error);
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid configuration schema',
          details: validation.error?.issues || [],
        },
        { status: 500 }
      );
    }

    console.log(`[Config API] Config returned successfully:`, {
      tenantSlug,
      title: validation.data?.meta.title,
      appType: validation.data?.meta.appType,
      productCount: products.length,
    });

    return NextResponse.json({
      success: true,
      config: validation.data,
      tenantSlug,
      tenantId: String(tenant.id),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Config API] Error:', error);
    alertApiError('/api/config', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to load configuration',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Convert Directus working_hours rows into display format for WorkingHours component.
 * Groups consecutive days with same hours into ranges like "Пн–Пт" / "Mon–Fri".
 */
function formatWorkingHours(hours: WorkingHours[], isRu: boolean): Array<{ day: string; time: string }> {
  if (hours.length === 0) {
    // Fallback if no data
    return isRu
      ? [{ day: 'Пн–Пт', time: '9:00–18:00' }, { day: 'Сб–Вс', time: 'Выходной' }]
      : [{ day: 'Mon–Fri', time: '9:00–18:00' }, { day: 'Sat–Sun', time: 'Closed' }];
  }

  const dayNamesRu = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  const dayNamesEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayNames = isRu ? dayNamesRu : dayNamesEn;
  const closedText = isRu ? 'Выходной' : 'Closed';

  // Sort by day_of_week, put Sunday (0) at end for display
  const sorted = [...hours].sort((a, b) => {
    const orderA = a.day_of_week === 0 ? 7 : a.day_of_week;
    const orderB = b.day_of_week === 0 ? 7 : b.day_of_week;
    return orderA - orderB;
  });

  // Group consecutive days with same schedule
  const groups: Array<{ days: number[]; time: string }> = [];
  for (const h of sorted) {
    const time = h.is_day_off ? closedText : `${h.start_time}–${h.end_time}`;
    const last = groups[groups.length - 1];
    if (last && last.time === time) {
      last.days.push(h.day_of_week);
    } else {
      groups.push({ days: [h.day_of_week], time });
    }
  }

  return groups.map(g => {
    const first = dayNames[g.days[0]];
    const last = dayNames[g.days[g.days.length - 1]];
    const day = g.days.length === 1 ? first : `${first}–${last}`;
    return { day, time: g.time };
  });
}

/**
 * Build infobiz home page components ordered by homeScenario.
 */
function buildInfobizHomeComponents(
  tenant: { name: string; config?: { theme?: { primaryColor?: string }; homeScenario?: string; contacts?: { phone?: string; telegram?: string; whatsapp?: string; address?: string; socials?: Array<{ type: string; url: string }> }; cta?: { text?: string; sticky?: boolean; page?: string; secondaryText?: string; secondaryAction?: string }; sections?: Record<string, boolean>; sectionOrder?: string[] } },
  infoItems: Array<Record<string, unknown>>,
  infoMkt: { subtitle?: string; features?: Array<{ icon: string; title: string; description: string }>; testimonials?: Array<{ name: string; role?: string; rating: number; text: string }>; faq?: Array<{ question: string; answer: string }> } | undefined,
  infoRu: boolean,
  productCount: number,
): ComponentInstance[] {
  const scenario = tenant.config?.homeScenario || 'buy_course';

  const hero: ComponentInstance = {
    id: 'infobiz-hero', type: 'HeroBanner',
    props: {
      title: tenant.name,
      subtitle: infoMkt?.subtitle || (infoRu ? 'Знания, которые окупаются. Начни учиться сегодня.' : 'Knowledge that pays for itself. Start learning today.'),
      backgroundColor: tenant.config?.theme?.primaryColor || '#6366f1',
      ctaText: infoRu ? 'Смотреть курсы →' : 'Browse courses →',
      ctaPage: 'catalog', align: 'center', minHeight: '260px',
    },
  };

  const stats: ComponentInstance = {
    id: 'infobiz-stats', type: 'StatsRow',
    props: {
      items: [
        { icon: '👨‍🎓', value: '1,000+', label: infoRu ? 'Учеников' : 'Students' },
        { icon: '📚', value: String(productCount || 50), label: infoRu ? 'Курсов' : 'Courses' },
        { icon: '⭐', value: '4.9', label: infoRu ? 'Рейтинг' : 'Rating' },
        { icon: '🏆', value: infoRu ? '3 года' : '3 yrs', label: infoRu ? 'Онлайн' : 'Online' },
      ],
    },
  };

  const featuredProducts: ComponentInstance = {
    id: 'info-product-list-featured', type: 'InfoProductList',
    props: { title: infoRu ? '🔥 Популярное' : '🔥 Popular right now', data: infoItems.slice(0, 4) },
  };

  const allProducts: ComponentInstance = {
    id: 'info-product-list-all', type: 'InfoProductList',
    props: { title: infoRu ? 'Все продукты' : 'All Products', data: infoItems },
  };

  const testimonials: ComponentInstance = {
    id: 'infobiz-testimonials', type: 'Testimonials',
    props: {
      title: infoRu ? '❤️ Отзывы учеников' : '❤️ Student reviews', layout: 'cards',
      items: infoMkt?.testimonials || (infoRu
        ? [
            { name: 'Елена В.', role: 'Маркетолог', rating: 5, text: 'Курс полностью изменил мой подход к запускам. Окупился за первую неделю!' },
            { name: 'Дмитрий К.', role: 'Предприниматель', rating: 5, text: 'Наконец-то курс по автоматизации, который реально работает. Экономлю 10 часов в неделю.' },
            { name: 'Анна Л.', rating: 5, text: 'Записалась на консультацию — получила больше пользы, чем за 3 месяца работы с агентством.' },
          ]
        : [
            { name: 'Elena V.', role: 'Marketing Manager', rating: 5, text: 'The course completely changed how I approach product launches. Paid for itself in the first week!' },
            { name: 'Dmitri K.', role: 'Entrepreneur', rating: 5, text: 'Finally a no-code automation course that actually works. Saved me 10 hours a week.' },
            { name: 'Anna L.', rating: 5, text: 'Booked the strategy session and got more value than 3 months of agency work. Highly recommend.' },
          ]),
    },
  };

  const features: ComponentInstance = {
    id: 'infobiz-features', type: 'FeaturesList',
    props: {
      title: infoRu ? 'Что вы получите' : 'What you get', columns: 2, layout: 'cards',
      items: infoMkt?.features || (infoRu
        ? [
            { icon: '📚', title: 'Экспертные знания', description: 'Практические навыки от реальных практиков' },
            { icon: '⚡', title: 'Учитесь в своём темпе', description: 'Бессрочный доступ, без дедлайнов' },
            { icon: '💬', title: 'Прямая поддержка', description: 'Задавайте вопросы, получайте ответы быстро' },
            { icon: '⭐', title: 'Оплата Stars', description: 'Безопасная оплата через Telegram Stars' },
          ]
        : [
            { icon: '📚', title: 'Expert knowledge', description: 'Practical skills from real practitioners' },
            { icon: '⚡', title: 'Learn at your pace', description: 'Lifetime access, no deadlines' },
            { icon: '💬', title: 'Direct support', description: 'Ask questions, get answers fast' },
            { icon: '⭐', title: 'Stars payment', description: 'Pay securely with Telegram Stars' },
          ]),
    },
  };

  const faq: ComponentInstance = {
    id: 'infobiz-faq', type: 'FaqAccordion',
    props: {
      title: infoRu ? 'Вопросы и ответы' : 'FAQ',
      items: infoMkt?.faq || (infoRu
        ? [
            { question: 'Доступ бессрочный?', answer: 'Да! После покупки доступ остаётся навсегда, включая все обновления без доплат.' },
            { question: 'Что если мне не понравится?', answer: 'Мы предлагаем возврат в течение 7 дней без вопросов. Просто напишите нам.' },
            { question: 'Как получить доступ после оплаты?', answer: 'После оплаты вы получите подтверждение в Telegram со ссылкой. Все покупки также доступны в истории заказов.' },
            { question: 'Можно ли оплатить Stars?', answer: 'Да, мы принимаем оплату через Telegram Stars — это быстро и безопасно.' },
          ]
        : [
            { question: 'Do I get lifetime access?', answer: 'Yes! Once you purchase you have access forever, including all future updates at no extra cost.' },
            { question: 'What if I\'m not satisfied?', answer: 'We offer a 7-day no-questions-asked refund. Just message us and we\'ll process it immediately.' },
            { question: 'How do I access my purchases?', answer: 'After payment you\'ll receive a confirmation in Telegram with a direct link. All purchases are also listed in your order history.' },
            { question: 'Can I pay with Stars?', answer: 'Yes, we accept Telegram Stars — it\'s fast and secure.' },
          ]),
    },
  };

  const leadForm: ComponentInstance = {
    id: 'infobiz-lead-form', type: 'LeadCaptureForm',
    props: { onSuccess: 'navigate:catalog' },
  };

  const ct = tenant.config?.contacts;
  const contactsBlock: ComponentInstance | null = (ct?.phone || ct?.telegram || ct?.whatsapp || ct?.address) ? {
    id: 'infobiz-contacts', type: 'ContactsBlock',
    props: {
      title: infoRu ? 'Контакты' : 'Contact us',
      ...ct,
    },
  } : null;

  const ctaCfg = tenant.config?.cta;
  const stickyCtaBar: ComponentInstance | null = (ctaCfg?.text && ctaCfg?.sticky !== false) ? {
    id: 'infobiz-sticky-cta', type: 'StickyCtaBar',
    props: {
      text: ctaCfg.text,
      page: ctaCfg.page || 'catalog',
      ...(ctaCfg.secondaryText ? { secondaryText: ctaCfg.secondaryText } : {}),
      ...(ctaCfg.secondaryAction ? { secondaryAction: ctaCfg.secondaryAction } : {}),
    },
  } : null;

  // ── User Reviews (feature-flagged) ─────────────────────────────────
  const reviewsCfg = (tenant.config as Record<string, unknown>)?.features as Record<string, unknown> | undefined;
  const reviewsOn = (reviewsCfg?.reviews as { enabled?: boolean; businessReviews?: boolean })?.enabled && (reviewsCfg?.reviews as { businessReviews?: boolean })?.businessReviews !== false;
  const reviewsList: ComponentInstance | null = reviewsOn ? {
    id: 'infobiz-reviews',
    type: 'ReviewsList',
    props: {
      title: infoRu ? 'Отзывы' : 'Reviews',
      targetType: 'business',
      limit: 5,
      compact: false,
      showForm: (reviewsCfg?.reviews as { allowSubmission?: boolean })?.allowSubmission !== false,
    },
  } : null;

  // ── Section key → component mapping ─────────────────────────────────
  const sectionMap: Record<string, ComponentInstance | null> = {
    heroBanner: hero,
    stats,
    products: scenario === 'browse_catalog' ? allProducts : featuredProducts,
    features,
    testimonials,
    reviews: reviewsList,
    faq,
    leadForm,
    contacts: contactsBlock,
    stickyCta: stickyCtaBar,
  };

  const defaultOrderByScenario: Record<string, string[]> = {
    browse_catalog: ['heroBanner', 'stats', 'products', 'features', 'testimonials', 'reviews', 'faq', 'contacts', 'stickyCta'],
    lead_first:     ['heroBanner', 'leadForm', 'stats', 'products', 'testimonials', 'reviews', 'features', 'faq', 'contacts', 'stickyCta'],
    default:        ['heroBanner', 'stats', 'products', 'testimonials', 'reviews', 'features', 'faq', 'contacts', 'stickyCta'],
  };

  let order = tenant.config?.sectionOrder
    || defaultOrderByScenario[scenario]
    || defaultOrderByScenario.default;

  // Ensure feature-flagged sections (reviews) are included even in custom sectionOrder
  if (reviewsList && !order.includes('reviews')) {
    const insertAfter = ['testimonials', 'features', 'products'];
    let insertIdx = -1;
    for (const key of insertAfter) {
      const idx = order.indexOf(key);
      if (idx >= 0 && idx > insertIdx) insertIdx = idx;
    }
    order = [...order];
    order.splice(insertIdx >= 0 ? insertIdx + 1 : order.length, 0, 'reviews');
  }

  const vis = tenant.config?.sections || {};

  return order
    .filter(key => vis[key] !== false)
    .map(key => sectionMap[key])
    .filter(Boolean) as ComponentInstance[];
}

/**
 * Build home page components in the order defined by homeScenario.
 * Each component is built independently, then assembled per scenario.
 */
function buildHomeComponents(
  tenant: { name: string; config?: { theme?: { primaryColor?: string }; phone?: string; address?: string; homeScenario?: string; contacts?: { phone?: string; telegram?: string; whatsapp?: string; address?: string; socials?: Array<{ type: string; url: string }> }; cta?: { text?: string; sticky?: boolean; page?: string; secondaryText?: string; secondaryAction?: string }; sections?: Record<string, boolean>; sectionOrder?: string[]; marketing?: { subtitle?: string; features?: Array<{ icon: string; title: string; description: string }>; testimonials?: Array<{ name: string; role?: string; rating: number; text: string }>; promo?: { title: string; subtitle?: string; ctaText?: string; emoji?: string } } } },
  items: Array<{ id: string; name: string; price: number; description?: string | null; image?: string; category?: string | null; duration?: number; badge?: string; stockQuantity?: number }>,
  staff: Staff[],
  workingHours: WorkingHours[],
  mkt: typeof tenant.config.marketing | undefined,
  isBooking: boolean,
  isEcommerce: boolean,
  isRu: boolean,
): ComponentInstance[] {
  const scenario = tenant.config?.homeScenario || (isBooking ? 'choose_service' : isEcommerce ? 'quick_order' : 'buy_course');

  // ── Define all possible components ──────────────────────────────────

  const hero: ComponentInstance = {
    id: 'home-hero',
    type: 'HeroBanner',
    props: {
      title: tenant.name,
      subtitle: mkt?.subtitle
        || (isBooking
          ? (isRu ? 'Запишитесь в пару кликов. Без звонков.' : 'Book your appointment in seconds. No calls needed.')
          : (isRu ? 'Свежие ингредиенты, быстрая доставка. Закажи в один тап.' : 'Fresh ingredients, fast delivery. Order in a tap.')),
      backgroundColor: tenant.config?.theme?.primaryColor || (isBooking ? '#1a1a2e' : '#c0392b'),
      ctaText: isBooking
        ? (isRu ? 'Записаться →' : 'Book now →')
        : (isRu ? 'Заказать →' : 'Order now →'),
      ctaPage: 'catalog',
      align: 'center',
      minHeight: '240px',
    },
  };

  const promo: ComponentInstance | null = mkt?.promo?.title ? {
    id: 'home-promo-banner',
    type: 'BannerCta',
    props: {
      emoji: mkt.promo.emoji || '🎉',
      text: mkt.promo.title,
      subtext: mkt.promo.subtitle || '',
      ctaText: mkt.promo.ctaText || (isRu ? 'Заказать' : 'Order now'),
      ctaPage: 'catalog',
      variant: 'subtle',
    },
  } : isEcommerce ? {
    id: 'home-promo-banner',
    type: 'BannerCta',
    props: {
      emoji: '🎉',
      text: isRu ? 'Бесплатная доставка от 1000₽' : 'Free delivery on orders over $20',
      subtext: isRu ? 'Только сегодня — промокод FREE20' : 'Today only — use code FREE20',
      ctaText: isRu ? 'Заказать' : 'Order now',
      ctaPage: 'catalog',
      variant: 'subtle',
    },
  } : null;

  const categories: ComponentInstance | null = isEcommerce ? {
    id: 'home-categories',
    type: 'CategoryGrid',
    props: {
      title: 'Categories',
      columns: 2,
      items: Array.from(
        new Set(items.map(i => i.category).filter(Boolean))
      ).slice(0, 6).map((cat, idx) => ({
        id: String(idx),
        name: cat,
        icon: ['🍕', '🍝', '🥗', '🍹', '🍔', '🍰'][idx] || '🛒',
        count: items.filter(i => i.category === cat).length,
      })),
    },
  } : null;

  const hours: ComponentInstance | null = isBooking ? {
    id: 'home-working-hours',
    type: 'WorkingHours',
    props: {
      title: isRu ? 'Часы работы' : 'Working hours',
      ...(tenant.config?.phone ? { phone: tenant.config.phone } : {}),
      ...(tenant.config?.address ? { address: tenant.config.address } : {}),
      hours: formatWorkingHours(workingHours, isRu),
    },
  } : null;

  const featured: ComponentInstance = {
    id: 'product-list-featured',
    type: isBooking ? 'ServiceList' : 'ProductList',
    props: {
      title: isEcommerce
        ? (isRu ? '🔥 Популярное' : '🔥 Popular')
        : (isRu ? '✨ Наши услуги' : '✨ Our Services'),
      description: isEcommerce
        ? (isRu ? 'Самое заказываемое сегодня' : 'Most ordered today')
        : (isRu ? 'Выберите что вам нужно' : 'Choose what you need'),
      columns: 2,
      limit: 6,
      data: items.slice(0, 6),
    },
  };

  const staffList: ComponentInstance | null = isBooking && staff.length > 0 ? {
    id: 'home-staff',
    type: 'StaffList',
    props: {
      title: isRu ? 'Наши мастера' : 'Our specialists',
      layout: 'cards',
      items: staff.map((member) => ({
        id: String(member.id),
        name: member.name,
        bio: member.bio || undefined,
        photo: member.image ? toAssetUrl(member.image) : undefined,
        ctaText: isRu ? `Записаться к ${member.name.split(' ')[0]}` : `Book with ${member.name.split(' ')[0]}`,
        ctaPage: 'catalog',
      })),
    },
  } : null;

  const features: ComponentInstance = {
    id: 'home-features',
    type: 'FeaturesList',
    props: {
      title: isRu ? 'Почему мы' : 'Why choose us',
      columns: 2,
      layout: 'cards',
      items: mkt?.features || (isBooking
        ? [
            { icon: '📅', title: isRu ? 'Лёгкая запись' : 'Easy booking', description: isRu ? 'Выберите дату и время в 3 тапа' : 'Pick date & time in 3 taps' },
            { icon: '🔔', title: isRu ? 'Напоминания' : 'Reminders', description: isRu ? 'Уведомим за час до визита' : 'Get notified 1 hour before' },
            { icon: '💳', title: isRu ? 'Оплата в Telegram' : 'Secure payment', description: isRu ? 'Платите через Telegram, без карт' : 'Pay via Telegram, no card needed' },
            { icon: '❌', title: isRu ? 'Бесплатная отмена' : 'Free cancellation', description: isRu ? 'Отмена за 2 часа до визита' : 'Cancel up to 2 hours before' },
          ]
        : [
            { icon: '🚀', title: isRu ? 'Быстрая доставка' : 'Fast delivery', description: isRu ? '30 минут или меньше' : '30 min or less guaranteed' },
            { icon: '👨‍🍳', title: isRu ? 'Свежее каждый день' : 'Fresh daily', description: isRu ? 'Готовим из лучших ингредиентов' : 'Prepared with premium ingredients' },
            { icon: '💳', title: isRu ? 'Оплата в Telegram' : 'Telegram pay', description: isRu ? 'Без привязки карты' : 'No credit card required' },
            { icon: '⭐', title: isRu ? 'Рейтинг 4.9' : '4.9 rating', description: isRu ? 'Нас любят 2000+ клиентов' : 'Loved by 2,000+ customers' },
          ]),
    },
  };

  const testimonials: ComponentInstance = {
    id: 'home-testimonials',
    type: 'Testimonials',
    props: {
      title: isRu ? '⭐ Отзывы' : '⭐ Reviews',
      layout: 'cards',
      items: mkt?.testimonials || (isBooking
        ? [
            { name: isRu ? 'Мария С.' : 'Maria S.', role: isRu ? 'Постоянный клиент' : 'Regular client', rating: 5, text: isRu ? 'Записалась за 30 секунд. Мастер пришёл вовремя, результат отличный!' : 'Booking took 30 seconds. The master was on time and did amazing work.' },
            { name: isRu ? 'Алексей П.' : 'Alex P.', role: isRu ? 'Первый визит' : 'First visit', rating: 5, text: isRu ? 'Нашёл через друга. Отличная атмосфера, профессиональная команда.' : 'Great atmosphere, professional team. Highly recommend.' },
            { name: isRu ? 'Катя М.' : 'Kate M.', rating: 4, text: isRu ? 'Очень удобное приложение. Нравится что напоминает перед визитом.' : 'Very convenient app. Love that I get a reminder before my appointment.' },
          ]
        : [
            { name: isRu ? 'Иван Д.' : 'John D.', role: isRu ? 'Постоянный клиент' : 'Regular customer', rating: 5, text: isRu ? 'Лучшая пицца в районе! Всегда свежая, всегда вовремя.' : 'Best pizza in the area! Always fresh, always on time.' },
            { name: isRu ? 'Светлана К.' : 'Sarah K.', rating: 5, text: isRu ? 'Заказали на весь офис — все были в восторге. Быстрая доставка!' : 'Ordered for the whole office — everyone was impressed.' },
            { name: isRu ? 'Михаил Р.' : 'Mike R.', rating: 4, text: isRu ? 'Хорошее качество, справедливые цены. Через Telegram заказывать очень удобно.' : 'Solid quality, fair prices. Telegram ordering is so convenient.' },
          ]),
    },
  };

  const ct = tenant.config?.contacts;
  const contactsBlock: ComponentInstance | null = (ct?.phone || ct?.telegram || ct?.whatsapp || ct?.address) ? {
    id: 'home-contacts',
    type: 'ContactsBlock',
    props: {
      title: isRu ? 'Контакты' : 'Contact us',
      ...ct,
    },
  } : null;

  const ctaCfg = tenant.config?.cta;
  const stickyCtaBar: ComponentInstance | null = (ctaCfg?.text && ctaCfg?.sticky !== false) ? {
    id: 'home-sticky-cta',
    type: 'StickyCtaBar',
    props: {
      text: ctaCfg.text,
      page: ctaCfg.page || 'catalog',
      ...(ctaCfg.secondaryText ? { secondaryText: ctaCfg.secondaryText } : {}),
      ...(ctaCfg.secondaryAction ? { secondaryAction: ctaCfg.secondaryAction } : {}),
    },
  } : null;

  // ── User Reviews (feature-flagged) ─────────────────────────────────
  const reviewsConfig = (tenant.config as Record<string, unknown>)?.features as Record<string, unknown> | undefined;
  const reviewsEnabled = (reviewsConfig?.reviews as { enabled?: boolean; businessReviews?: boolean })?.enabled && (reviewsConfig?.reviews as { businessReviews?: boolean })?.businessReviews !== false;
  const reviewsList: ComponentInstance | null = reviewsEnabled ? {
    id: 'home-reviews',
    type: 'ReviewsList',
    props: {
      title: isRu ? 'Отзывы клиентов' : 'Customer reviews',
      targetType: 'business',
      limit: 5,
      compact: false,
      showForm: (reviewsConfig?.reviews as { allowSubmission?: boolean })?.allowSubmission !== false,
    },
  } : null;

  // ── Section key → component mapping ─────────────────────────────────
  const sectionMap: Record<string, ComponentInstance | null> = {
    heroBanner: hero,
    promo,
    categories,
    products: featured,
    staff: staffList,
    hours,
    features,
    testimonials,
    reviews: reviewsList,
    contacts: contactsBlock,
    stickyCta: stickyCtaBar,
  };

  // ── Default order by scenario ───────────────────────────────────────
  const defaultOrderByScenario: Record<string, string[]> = {
    catalog_browse: ['heroBanner', 'categories', 'products', 'promo', 'features', 'testimonials', 'reviews', 'contacts', 'stickyCta'],
    promo_first:    ['promo', 'heroBanner', 'products', 'categories', 'features', 'testimonials', 'reviews', 'contacts', 'stickyCta'],
    choose_master:  ['heroBanner', 'staff', 'products', 'hours', 'features', 'testimonials', 'reviews', 'contacts', 'stickyCta'],
    choose_time:    ['heroBanner', 'hours', 'products', 'staff', 'features', 'testimonials', 'reviews', 'contacts', 'stickyCta'],
    // quick_order / choose_service / default
    default:        ['heroBanner', 'promo', 'categories', 'hours', 'products', 'staff', 'features', 'testimonials', 'reviews', 'contacts', 'stickyCta'],
  };

  // Use custom sectionOrder if provided, otherwise fall back to scenario default
  let order = tenant.config?.sectionOrder
    || defaultOrderByScenario[scenario]
    || defaultOrderByScenario.default;

  // Ensure feature-flagged sections (reviews) are included even in custom sectionOrder
  if (reviewsList && !order.includes('reviews')) {
    // Insert reviews after testimonials, or at the end before contacts/stickyCta
    const insertAfter = ['testimonials', 'features', 'products'];
    let insertIdx = -1;
    for (const key of insertAfter) {
      const idx = order.indexOf(key);
      if (idx >= 0 && idx > insertIdx) insertIdx = idx;
    }
    order = [...order];
    order.splice(insertIdx >= 0 ? insertIdx + 1 : order.length, 0, 'reviews');
  }

  const vis = tenant.config?.sections || {};

  return order
    .filter(key => vis[key] !== false)        // respect visibility toggles
    .map(key => sectionMap[key])              // map to components
    .filter(Boolean) as ComponentInstance[];   // remove nulls
}

/**
 * Build MiniAppSchemaType config from Directus tenant, products and services data
 */
function buildConfigFromDirectus(tenant: {
  id: number | string;
  name: string;
  slug: string;
  config?: {
    theme?: {
      primaryColor?: string;
      secondaryColor?: string;
    };
    businessType?: string;
    currency?: string;
    locale?: string;
    logo?: string;
    homeScenario?: string;
    contacts?: {
      phone?: string;
      telegram?: string;
      whatsapp?: string;
      address?: string;
      socials?: Array<{ type: string; url: string }>;
    };
    style?: {
      tone?: string;
      density?: string;
      visual?: string;
    };
    cta?: {
      text?: string;
      sticky?: boolean;
      page?: string;
      secondaryText?: string;
      secondaryAction?: string;
    };
    sections?: Record<string, boolean>;
    sectionOrder?: string[];
    marketing?: {
      subtitle?: string;
      features?: Array<{ icon: string; title: string; description: string }>;
      testimonials?: Array<{ name: string; role?: string; rating: number; text: string }>;
      faq?: Array<{ question: string; answer: string }>;
      promo?: { title: string; subtitle?: string; ctaText?: string; emoji?: string };
    };
    phone?: string;
    address?: string;
    payments?: {
      yookassa?: { shopId: string; secretKey: string; testMode: boolean };
      methods?: Array<'yookassa' | 'stars' | 'cash'>;
    };
    delivery?: {
      methods?: Array<'pickup' | 'courier' | 'cdek'>;
      pickupPoints?: Array<{ id: string; name: string; address: string; city?: string; phone?: string; workingHours?: string }>;
      courier?: { price: number; freeFrom: number; estimatedTime: string; zone?: string };
      cdek?: { testMode: boolean; senderCityCode: number; tariffCodes: number[] };
    };
  };
}, products: Array<{
  id: number | string;
  name: string;
  price: number;
  description?: string | null;
  image?: string | null;
  category?: string | null;
  status: string;
  stock_quantity?: number | null;
}>, services: Array<{
  id: number | string;
  name: string;
  price: number;
  duration?: number;
  description?: string | null;
  image?: string | null;
  category?: string | null;
  status: string;
}>, infoProducts: InfoProduct[] = [], staff: Staff[] = [], workingHours: WorkingHours[] = []): MiniAppSchemaType {
  // Map Directus products/services to display format
  const isBooking = tenant.config?.businessType === 'booking';
  const isInfobiz = tenant.config?.businessType === 'infobiz';

  // Infobiz: return separate config early
  if (isInfobiz) {
    const infoMkt = tenant.config?.marketing;
    const infoRu = tenant.config?.locale === 'ru';

    const infoItems = infoProducts.map(p => ({
      id: String(p.id),
      name: p.name,
      slug: p.slug,
      type: p.type,
      price: p.price,
      description: p.description,
      content: p.content,
      image: toAssetUrl(p.image),
      fileId: p.file_id,
      externalUrl: p.external_url,
    }));

    return {
      meta: {
        title: tenant.name,
        logo: tenant.config?.logo ? toAssetUrl(tenant.config.logo) : undefined,
        locale: tenant.config?.locale || 'en',
        currency: tenant.config?.currency || 'USD',
        theme: {
          primaryColor: tenant.config?.theme?.primaryColor || '#6366f1',
          secondaryColor: tenant.config?.theme?.secondaryColor || '#8b5cf6',
        },
        appType: 'infobiz',
        tenantId: String(tenant.id),
        slug: tenant.slug,
        ...(tenant.config?.style ? { style: tenant.config.style } : {}),
        // Pass payment methods to frontend (never expose secretKey)
        ...(tenant.config?.payments?.methods && {
          payments: {
            methods: tenant.config.payments.methods,
            testMode: tenant.config.payments.yookassa?.testMode ?? true,
          },
        }),
      },
      features: extractFeatures(tenant.config as Record<string, unknown>),
      dataModel: {
        InfoProduct: {
          name: 'InfoProduct',
          fields: {
            id: { type: 'string', required: true },
            name: { type: 'string', required: true },
            type: { type: 'string', required: true },
            price: { type: 'number', required: true },
          },
        },
      },
      pages: [
        {
          id: 'home',
          title: tenant.name,
          route: '/',
          components: buildInfobizHomeComponents(tenant, infoItems, infoMkt, infoRu, infoProducts.length),
        },
        {
          id: 'catalog',
          title: infoRu ? 'Продукты' : 'Products',
          route: '/catalog',
          components: [
            {
              id: 'info-product-list-catalog',
              type: 'InfoProductList',
              props: {
                title: infoRu ? 'Все продукты' : 'All Products',
                data: infoItems,
              },
            },
          ],
        },
        {
          id: 'product-details',
          title: infoRu ? 'Подробнее' : 'Product Details',
          route: '/product-details',
          components: [
            {
              id: 'info-product-details-1',
              type: 'InfoProductDetails',
              props: {},
            },
          ],
        },
        {
          id: 'lead-form',
          title: infoRu ? 'Связаться' : 'Contact Us',
          route: '/lead-form',
          components: [
            {
              id: 'lead-form-1',
              type: 'LeadCaptureForm',
              props: {
                onSuccess: 'navigate:home',
              },
            },
          ],
        },
        {
          id: 'checkout',
          title: infoRu ? 'Оформление' : 'Checkout',
          route: '/checkout',
          components: [
            {
              id: 'infobiz-checkout-1',
              type: 'InfobizCheckout',
              props: {
                onSuccess: 'navigate:order-success',
              },
            },
          ],
        },
        {
          id: 'order-success',
          title: infoRu ? 'Заказ подтверждён' : 'Order Confirmed',
          route: '/order-success',
          components: [
            {
              id: 'order-success-1',
              type: 'OrderSuccess',
              props: {
                onContinue: 'navigate:home',
              },
            },
          ],
        },
        {
          id: 'my-purchases',
          title: infoRu ? 'Мои покупки' : 'My Purchases',
          route: '/my-purchases',
          components: [
            {
              id: 'my-purchases-list',
              type: 'OrdersList',
              props: {
                title: infoRu ? '📚 Мои покупки' : '📚 My Purchases',
                description: infoRu ? 'Продукты, которые вы приобрели' : 'Products you have bought',
                showUserOrdersOnly: true,
                onOrderClick: 'navigate:product-details',
                emptyMessage: infoRu ? 'Пока нет покупок. Посмотрите наши продукты.' : 'No purchases yet. Browse our products to get started.',
              },
            },
          ],
        },
      ],
    };
  }

  // Marketing data from LLM (or fallbacks)
  const mkt = tenant.config?.marketing;
  const isRu = tenant.config?.locale === 'ru';

  const items = isBooking
    ? services.map(s => ({
        id: String(s.id),
        name: s.name,
        price: s.price,
        description: s.description,
        image: toAssetUrl(s.image),
        category: s.category,
        duration: s.duration,
        badge: s.status === 'active' ? undefined : s.status,
      }))
    : products.map(p => ({
        id: String(p.id),
        name: p.name,
        price: p.price,
        description: p.description,
        image: toAssetUrl(p.image),
        category: p.category,
        badge: p.status === 'published' ? undefined : p.status,
        stockQuantity: p.stock_quantity ?? -1,
      }));

  // Build config based on business type
  const isEcommerce = !isBooking;
  
  return {
    meta: {
      title: tenant.name,
      logo: tenant.config?.logo ? toAssetUrl(tenant.config.logo) : undefined,
      locale: tenant.config?.locale || 'en',
      currency: tenant.config?.currency || 'USD',
      theme: {
        primaryColor: tenant.config?.theme?.primaryColor || '#007AFF',
        secondaryColor: tenant.config?.theme?.secondaryColor || '#5856D6',
      },
      appType: (tenant.config?.businessType as 'ecommerce' | 'booking' | 'infobiz') || 'ecommerce',
      tenantId: String(tenant.id),
      slug: tenant.slug,
      ...(tenant.config?.style ? { style: tenant.config.style } : {}),
      ...(tenant.config?.cta?.text ? { cta: tenant.config.cta } : {}),
      // Pass payment methods to frontend (never expose secretKey)
      ...(tenant.config?.payments?.methods && {
        payments: {
          methods: tenant.config.payments.methods,
          testMode: tenant.config.payments.yookassa?.testMode ?? true,
        },
      }),
      // Pass delivery config to frontend — ecommerce only (never expose CDEK secrets)
      ...(isEcommerce && tenant.config?.delivery?.methods && {
        delivery: {
          methods: tenant.config.delivery.methods,
          pickupPoints: tenant.config.delivery.pickupPoints || [],
          courier: tenant.config.delivery.courier,
        },
      }),
    },
    features: extractFeatures(tenant.config as Record<string, unknown>),
    dataModel: {
      Product: {
        name: 'Product',
        fields: {
          id: { type: 'string', required: true },
          name: { type: 'string', required: true },
          price: { type: 'number', required: true },
          image: { type: 'string', required: false },
          description: { type: 'string', required: false },
          category: { type: 'string', required: false },
        },
      },
    },
    pages: [
      {
        id: 'home',
        title: tenant.name,
        route: '/',
        components: buildHomeComponents(tenant, items, staff, workingHours, mkt, isBooking, isEcommerce, isRu),
      },
      {
        id: 'catalog',
        title: isEcommerce ? (isRu ? 'Каталог' : 'Catalog') : (isRu ? 'Все услуги' : 'All Services'),
        route: '/catalog',
        components: [
          {
            id: 'product-list-catalog',
            type: isBooking ? 'ServiceList' : 'ProductList',
            props: {
              title: isEcommerce ? (isRu ? 'Все товары' : 'All Products') : (isRu ? 'Все услуги' : 'All Services'),
              columns: 2,
              data: items,
            },
          },
        ],
      },
      {
        id: 'cart',
        title: isRu ? 'Корзина' : 'Shopping Cart',
        route: '/cart',
        components: [
          {
            id: 'cart-items',
            type: 'Cart',
            props: {
              showEmpty: true,
              emptyMessage: isRu ? 'Корзина пуста' : 'Your cart is empty',
            },
          },
          {
            id: 'cart-summary',
            type: 'CartSummary',
            props: {
              showSubtotal: true,
              showDiscount: true,
              showTotal: true,
              promoCodeEnabled: true,
              onCheckout: 'navigate:checkout',
            },
          },
        ],
      },
      {
        id: 'checkout',
        title: isBooking ? (isRu ? 'Запись' : 'Book Appointment') : (isRu ? 'Оформление' : 'Checkout'),
        route: '/checkout',
        components: isBooking
          ? [
              {
                id: 'checkout-form',
                type: 'BookingCheckoutForm',
                props: {},
              },
            ]
          : [
              {
                id: 'checkout-form',
                type: 'CheckoutForm',
                props: {},
              },
              {
                id: 'payment-button',
                type: 'PaymentButton',
                props: {
                  text: isRu ? 'Оплатить' : 'Pay Now',
                  variant: 'telegram',
                  onPaymentSuccess: 'navigate:order-success',
                },
              },
            ],
      },
      {
        id: 'order-success',
        title: isRu ? 'Заказ подтверждён' : 'Order Confirmed',
        route: '/order-success',
        components: [
          {
            id: 'order-success-1',
            type: 'OrderSuccess',
            props: {
              onContinue: 'navigate:home',
            },
          },
        ],
      },
      // Booking-specific success page (used only when businessType === 'booking')
      ...(isBooking ? [{
        id: 'booking-success',
        title: isRu ? 'Запись подтверждена' : 'Booking Confirmed',
        route: '/booking-success',
        components: [
          {
            id: 'booking-success-1',
            type: 'BookingSuccess',
            props: {},
          },
        ],
      }] : []),
      {
        id: 'product-details',
        title: isRu ? 'Подробнее' : 'Product Details',
        route: '/product-details',
        components: [
          {
            id: 'product-details-1',
            type: 'ProductDetails',
            props: {
              productId: '',
            },
          },
        ],
      },
      {
        id: 'orders',
        title: isRu ? 'Мои заказы' : 'My Orders',
        route: '/orders',
        components: [
          {
            id: 'orders-list',
            type: 'OrdersList',
            props: {
              title: isRu ? 'Последние заказы' : 'Recent Orders',
              description: isRu ? 'Отслеживайте ваши заказы' : 'Track and manage your orders',
              showUserOrdersOnly: true,
              onOrderClick: 'navigate:order-details',
            },
          },
        ],
      },
      {
        id: 'order-details',
        title: isRu ? 'Детали заказа' : 'Order Details',
        route: '/order-details',
        components: [
          {
            id: 'order-details-1',
            type: 'OrderDetails',
            props: {},
          },
        ],
      },
      // Favorites (ecommerce only) — shows items saved with ♥ button
      ...(isEcommerce ? [{
        id: 'favorites',
        title: isRu ? 'Избранное' : 'Saved Items',
        route: '/favorites',
        components: [
          {
            id: 'favorites-list',
            type: 'ProductList',
            props: {
              title: isRu ? '❤️ Избранное' : '❤️ Saved items',
              description: isRu ? 'Товары, которые вы сохранили' : 'Products you marked as favorites',
              columns: 2,
              showFavoritesOnly: true,
              showCategoryFilter: false,
              emptyMessage: isRu ? 'Пока ничего не сохранено. Нажмите ♥ чтобы добавить.' : 'No saved items yet. Tap ♥ on any product to save it.',
              data: items,
            },
          },
        ],
      }] : []),
    ],
  };
}

/**
 * Load a direct config from the filesystem (set via POST /api/config/direct).
 * Returns the validated MiniAppSchemaType or null if not found / expired.
 */
async function loadDirectConfig(slug: string): Promise<MiniAppSchemaType | null> {
  try {
    const filePath = path.join(process.cwd(), '.data', 'direct-configs', `${slug}.json`);
    const raw = await fs.readFile(filePath, 'utf-8');
    const payload = JSON.parse(raw) as {
      config: MiniAppSchemaType;
      expiresAt?: string;
    };

    // Check TTL
    if (payload.expiresAt && new Date(payload.expiresAt) < new Date()) {
      // Expired — clean up
      await fs.unlink(filePath).catch(() => {});
      return null;
    }

    // Re-validate
    const validation = validateMiniAppSchema(payload.config);
    return validation.success && validation.data ? validation.data : null;
  } catch {
    return null;
  }
}
