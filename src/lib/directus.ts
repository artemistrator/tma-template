import { createDirectus, rest, readItems } from '@directus/sdk';

// Get Directus URL from environment
const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL || process.env.DIRECTUS_URL || 'http://localhost:8055';

// Create Directus client
export const directus = createDirectus(DIRECTUS_URL).with(rest());

// Types for our collections
export interface Tenant {
  id: number | string;
  name: string;
  slug: string;
  config: {
    theme?: {
      primaryColor?: string;
      secondaryColor?: string;
    };
    businessType?: 'ecommerce' | 'booking' | 'infobiz';
    currency?: string;
    locale?: string;
  };
  created_at?: string;
}

export interface Product {
  id: number | string;
  name: string;
  price: number;
  description?: string;
  image?: string | null;
  category?: string;
  status: 'draft' | 'published' | 'archived';
  tenant_id: string;
  created_at?: string;
}

export interface Order {
  id: number | string;
  customer_name: string;
  customer_phone?: string;
  customer_email?: string;
  total: number;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  items?: Array<{
    product_id: number | string;
    quantity: number;
    price: number;
  }>;
  shipping_address?: {
    address?: string;
    city?: string;
    zipCode?: string;
    country?: string;
  };
  tenant_id: string;
  created_at?: string;
}

/**
 * Get tenant by slug
 */
export async function getTenantBySlug(slug: string): Promise<Tenant | null> {
  try {
    const tenants = await directus.request(
      readItems('tenants', {
        filter: { slug: { _eq: slug } },
        limit: 1,
      })
    );
    return (tenants[0] as Tenant) || null;
  } catch (error) {
    console.error('Error fetching tenant:', error);
    return null;
  }
}

/**
 * Get products by tenant_id
 */
export async function getProductsByTenant(tenantId: string): Promise<Product[]> {
  try {
    return (await directus.request(
      readItems('products', {
        filter: { 
          tenant_id: { _eq: tenantId },
          status: { _eq: 'published' },
        },
      })
    )) as Product[];
  } catch (error) {
    console.error('Error fetching products:', error);
    return [];
  }
}

/**
 * Get all products (for admin)
 */
export async function getAllProducts(): Promise<Product[]> {
  try {
    return (await directus.request(readItems('products'))) as Product[];
  } catch (error) {
    console.error('Error fetching all products:', error);
    return [];
  }
}

/**
 * Get orders by tenant_id
 */
export async function getOrdersByTenant(tenantId: string): Promise<Order[]> {
  try {
    return (await directus.request(
      readItems('orders', {
        filter: { tenant_id: { _eq: tenantId } },
        sort: ['-created_at'],
      })
    )) as Order[];
  } catch (error) {
    console.error('Error fetching orders:', error);
    return [];
  }
}

export { DIRECTUS_URL };
