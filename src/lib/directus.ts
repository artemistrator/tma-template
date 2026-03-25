import { createDirectus, rest, readItems } from '@directus/sdk';

// Get Directus URL from environment
// DIRECTUS_URL takes priority (set by docker-compose to point to the service name)
// NEXT_PUBLIC_DIRECTUS_URL is for client-side / local dev
const DIRECTUS_URL = process.env.DIRECTUS_URL || process.env.NEXT_PUBLIC_DIRECTUS_URL || 'http://localhost:8055';

// Collections are publicly readable — no auth needed.
// authentication('json').login() throws TypeError with this Directus version.
const directus = createDirectus(DIRECTUS_URL).with(rest({
  onRequest: (options) => ({ ...options, cache: 'no-store' }),
}));

export { directus };

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
  stock_quantity?: number | null; // -1 = unlimited, 0 = out of stock, >0 = limited
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

export interface Service {
  id: number | string;
  name: string;
  price: number;
  duration?: number;
  description?: string | null;
  image?: string | null;
  category?: string | null;
  status: 'active' | 'inactive';
  tenant_id: string;
  created_at?: string;
}

export interface Booking {
  id: number | string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string | null;
  date: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  service_id: string;
  tenant_id: string;
  notes?: string | null;
  created_at?: string;
}

export interface WorkingHours {
  id: number | string;
  tenant_id: string;
  day_of_week: number; // 0=Sun, 1=Mon, ..., 6=Sat
  start_time: string;  // "09:00"
  end_time: string;    // "18:00"
  is_day_off: boolean;
}

export interface BlockedDate {
  id: number | string;
  tenant_id: string;
  date: string; // "YYYY-MM-DD"
  reason?: string | null;
}

export interface Staff {
  id: number | string;
  tenant_id: string;
  name: string;
  bio?: string | null;
  image?: string | null; // Directus asset UUID (field name is 'image' in DB)
  status: 'active' | 'inactive';
}

export interface InfoProduct {
  id: number | string;
  tenant_id: string;
  name: string;
  slug: string;
  type: 'article' | 'pdf' | 'course' | 'consultation';
  description?: string | null;
  content?: string | null;
  price: number;
  image?: string | null;
  file_id?: string | null;
  external_url?: string | null;
  status: 'published' | 'draft';
  created_at?: string;
}

export interface Review {
  id: number | string;
  tenant_id: string;
  author_name: string;
  telegram_user_id?: number | null;
  rating: number;
  text: string;
  target_type?: 'business' | 'product' | 'service' | 'info_product';
  target_id?: string | null;
  status: 'pending' | 'approved' | 'rejected';
  moderation_note?: string | null;
  created_at?: string;
  approved_at?: string | null;
  updated_at?: string | null;
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

/**
 * Get services by tenant_id
 */
export async function getServicesByTenant(tenantId: string): Promise<Service[]> {
  try {
    return (await directus.request(
      readItems('services', {
        filter: { 
          tenant_id: { _eq: tenantId },
          status: { _eq: 'active' },
        },
      })
    )) as Service[];
  } catch (error) {
    console.error('Error fetching services:', error);
    return [];
  }
}

/**
 * Get bookings by tenant_id
 */
export async function getBookingsByTenant(tenantId: string): Promise<Booking[]> {
  try {
    return (await directus.request(
      readItems('bookings', {
        filter: { tenant_id: { _eq: tenantId } },
        sort: ['-date'],
      })
    )) as Booking[];
  } catch (error) {
    console.error('Error fetching bookings:', error);
    return [];
  }
}

/**
 * Get staff members by tenant_id
 */
export async function getStaffByTenant(tenantId: string): Promise<Staff[]> {
  try {
    return (await directus.request(
      readItems('staff', {
        filter: {
          tenant_id: { _eq: tenantId },
        },
        sort: ['name'],
      })
    )) as Staff[];
  } catch (error) {
    console.error('Error fetching staff:', error);
    return [];
  }
}

/**
 * Get info products by tenant_id (for infobiz)
 */
export async function getInfoProductsByTenant(tenantId: string): Promise<InfoProduct[]> {
  try {
    return (await directus.request(
      readItems('info_products', {
        filter: {
          tenant_id: { _eq: tenantId },
          status: { _eq: 'published' },
        },
      })
    )) as InfoProduct[];
  } catch (error) {
    console.error('Error fetching info products:', error);
    return [];
  }
}

/**
 * Get working hours by tenant_id (for booking)
 */
export async function getWorkingHoursByTenant(tenantId: string): Promise<WorkingHours[]> {
  try {
    return (await directus.request(
      readItems('working_hours', {
        filter: { tenant_id: { _eq: tenantId } },
        sort: ['day_of_week'],
      })
    )) as WorkingHours[];
  } catch (error) {
    console.error('Error fetching working hours:', error);
    return [];
  }
}

/**
 * Get approved reviews by tenant_id
 */
export async function getReviewsByTenant(
  tenantId: string,
  options?: {
    targetType?: string;
    targetId?: string;
    limit?: number;
    offset?: number;
  }
): Promise<Review[]> {
  try {
    const filter: Record<string, unknown> = {
      tenant_id: { _eq: tenantId },
      status: { _eq: 'approved' },
    };
    if (options?.targetType) {
      filter.target_type = { _eq: options.targetType };
    }
    if (options?.targetId) {
      filter.target_id = { _eq: options.targetId };
    }
    return (await directus.request(
      readItems('reviews', {
        filter,
        sort: ['-created_at'],
        limit: options?.limit || 50,
        offset: options?.offset || 0,
      })
    )) as Review[];
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return [];
  }
}

/**
 * Get review summary (average rating + count) for a tenant or specific target
 */
export async function getReviewSummary(
  tenantId: string,
  targetType?: string,
  targetId?: string,
): Promise<{ averageRating: number; totalReviews: number; distribution: Record<number, number> }> {
  try {
    const filter: Record<string, unknown> = {
      tenant_id: { _eq: tenantId },
      status: { _eq: 'approved' },
    };
    if (targetType) filter.target_type = { _eq: targetType };
    if (targetId) filter.target_id = { _eq: targetId };

    const reviews = (await directus.request(
      readItems('reviews', {
        filter,
        fields: ['rating'],
        limit: -1,
      })
    )) as Array<{ rating: number }>;

    const totalReviews = reviews.length;
    if (totalReviews === 0) {
      return { averageRating: 0, totalReviews: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } };
    }

    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let sum = 0;
    for (const r of reviews) {
      sum += r.rating;
      distribution[r.rating] = (distribution[r.rating] || 0) + 1;
    }

    return {
      averageRating: Math.round((sum / totalReviews) * 10) / 10,
      totalReviews,
      distribution,
    };
  } catch (error) {
    console.error('Error fetching review summary:', error);
    return { averageRating: 0, totalReviews: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } };
  }
}

export { DIRECTUS_URL };
