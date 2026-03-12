import { NextRequest, NextResponse } from 'next/server';
import { getTenantBySlug, getProductsByTenant, getServicesByTenant } from '@/lib/directus';
import { validateMiniAppSchema, type MiniAppSchemaType } from '@/lib/schema/mini-app-schema';

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
    // Get tenant slug from query param
    const tenantSlug = request.nextUrl.searchParams.get('tenant') || 'pizza';

    console.log(`[Config API] Request received for tenant slug: ${tenantSlug}`);

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
    const products = await getProductsByTenant(tenant.slug);
    const services = isBooking ? await getServicesByTenant(tenant.slug) : [];
    
    console.log(`[Config API] Products: ${products.length}, Services: ${services.length}`);

    // Build config from Directus data
    const config: MiniAppSchemaType = buildConfigFromDirectus(tenant, products, services);

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
  };
}, products: Array<{
  id: number | string;
  name: string;
  price: number;
  description?: string | null;
  image?: string | null;
  category?: string | null;
  status: string;
}>, services: Array<{
  id: number | string;
  name: string;
  price: number;
  duration?: number;
  description?: string | null;
  category?: string | null;
  status: string;
}>): MiniAppSchemaType {
  // Map Directus products/services to display format
  const isBooking = tenant.config?.businessType === 'booking';
  const items = isBooking 
    ? services.map(s => ({
        id: String(s.id),
        name: s.name,
        price: s.price,
        description: s.description,
        category: s.category,
        duration: s.duration,
        badge: s.status === 'active' ? undefined : s.status,
      }))
    : products.map(p => ({
        id: String(p.id),
        name: p.name,
        price: p.price,
        description: p.description,
        image: p.image,
        category: p.category,
        badge: p.status === 'published' ? undefined : p.status,
      }));

  // Build config based on business type
  const isEcommerce = !isBooking;
  
  return {
    meta: {
      title: tenant.name,
      logo: '/logo.png',
      locale: tenant.config?.locale || 'en',
      currency: tenant.config?.currency || 'USD',
      theme: {
        primaryColor: tenant.config?.theme?.primaryColor || '#007AFF',
        secondaryColor: tenant.config?.theme?.secondaryColor || '#5856D6',
      },
      appType: (tenant.config?.businessType as 'ecommerce' | 'booking' | 'infobiz') || 'ecommerce',
      tenantId: String(tenant.id),
      slug: tenant.slug,
    },
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
        components: [
          {
            id: 'product-list-featured',
            type: 'ProductList',
            props: {
              title: isEcommerce ? 'Featured Products' : 'Our Services',
              description: isEcommerce ? 'Our best sellers' : 'Choose your service',
              columns: 2,
              limit: 6,
              data: items.slice(0, 6),
            },
          },
        ],
      },
      {
        id: 'catalog',
        title: isEcommerce ? 'Catalog' : 'All Services',
        route: '/catalog',
        components: [
          {
            id: 'product-list-catalog',
            type: 'ProductList',
            props: {
              title: isEcommerce ? 'All Products' : 'All Services',
              columns: 2,
              data: items,
            },
          },
        ],
      },
      {
        id: 'cart',
        title: 'Shopping Cart',
        route: '/cart',
        components: [
          {
            id: 'cart-items',
            type: 'Cart',
            props: {
              showEmpty: true,
              emptyMessage: 'Your cart is empty',
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
        title: 'Checkout',
        route: '/checkout',
        components: [
          {
            id: 'checkout-form',
            type: 'CheckoutForm',
            props: {},
          },
          {
            id: 'payment-button',
            type: 'PaymentButton',
            props: {
              text: 'Pay Now',
              variant: 'telegram',
              onPaymentSuccess: 'navigate:order-success',
            },
          },
        ],
      },
      {
        id: 'order-success',
        title: 'Order Confirmed',
        route: '/order-success',
        components: [
          {
            id: 'order-success-1',
            type: 'OrderSuccess',
            props: {
              orderId: 'ORD-123456',
              total: 29.99,
              onContinue: 'navigate:home',
            },
          },
        ],
      },
      {
        id: 'product-details',
        title: 'Product Details',
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
        title: 'My Orders',
        route: '/orders',
        components: [
          {
            id: 'orders-list',
            type: 'OrdersList',
            props: {
              title: 'Recent Orders',
              description: 'Track and manage your orders',
              showUserOrdersOnly: true,
              onOrderClick: 'navigate:order-details',
            },
          },
        ],
      },
      {
        id: 'order-details',
        title: 'Order Details',
        route: '/order-details',
        components: [
          {
            id: 'order-details-1',
            type: 'OrderDetails',
            props: {},
          },
        ],
      },
    ],
  };
}
