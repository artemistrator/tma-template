import axios from 'axios';
import dotenv from 'dotenv';
import { join } from 'path';

// Load .env.local but do NOT override shell env vars (so DIRECTUS_URL from shell takes precedence)
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const DIRECTUS_URL = process.env.DIRECTUS_URL || 'http://localhost:8055';
const ADMIN_EMAIL = process.env.DIRECTUS_ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.DIRECTUS_ADMIN_PASSWORD || 'admin';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function createApi(): Promise<any> {
  console.log('🔐 Logging in...');
  const response = await axios.post(`${DIRECTUS_URL}/auth/login`, {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });
  const token = response.data.data.access_token;
  const api = axios.create({ baseURL: DIRECTUS_URL });
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  console.log('✅ Logged in');
  return api;
}

/**
 * SAFE: creates collection only if it doesn't exist, then ensures fields.
 * Never deletes existing data.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function ensureCollection(api: any, id: string, name: string, icon: string, fields: any[]) {
  console.log(`\n📁 Ensuring collection "${name}"...`);

  // Check if collection exists
  let collectionExists = false;
  try {
    await api.get(`/collections/${id}`);
    collectionExists = true;
    console.log(`   ℹ️  Collection exists`);
  } catch {
    // Not found — will create
  }

  if (!collectionExists) {
    try {
      await api.post('/collections', {
        collection: id,
        meta: { collection: id, icon, singleton: false, accountability: 'all' },
        schema: { name: id },
      });
      console.log(`   ✅ Collection created`);
    } catch (e: any) {
      console.log(`   ⚠️  Could not create: ${e.response?.data?.errors?.[0]?.message || e.message}`);
    }
  }

  // Ensure each field — correct endpoint: POST /fields/{collection}
  for (const field of fields) {
    try {
      await api.post(`/fields/${id}`, {
        field: field.field,
        type: field.type,
        schema: field.schema || {},
        meta: field.meta || {},
      });
      console.log(`   ✅ Field: ${field.field}`);
    } catch (e: any) {
      const msg = e.response?.data?.errors?.[0]?.message || e.message || '';
      // Silently skip if field already exists
      if (msg.includes('already exists') || e.response?.status === 409 || msg.includes('duplicate')) {
        // field exists, skip
      } else {
        console.log(`   ⚠️  Field "${field.field}": ${msg}`);
      }
    }
  }
}

/**
 * Seeds a single item, skipping if it already exists (by uniqueField match).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function seedItem(api: any, collection: string, data: any, uniqueField: string) {
  try {
    const existing = await api.get(`/items/${collection}`, {
      params: { filter: { [uniqueField]: { _eq: data[uniqueField] } }, limit: 1 },
    });
    if (existing.data.data.length > 0) {
      console.log(`   ⏭️  ${data[uniqueField]} already exists`);
      return;
    }
  } catch {
    // collection may be empty or new
  }
  try {
    await api.post(`/items/${collection}`, data);
    console.log(`   ✅ ${data[uniqueField]} created`);
  } catch (e: any) {
    console.log(`   ⚠️  Could not create ${data[uniqueField]}: ${e.response?.data?.errors?.[0]?.message || e.message}`);
  }
}

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║       Directus Database Initialization                    ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  const api = await createApi();

  // ─────────────────────────────────────────────────────────────
  // EXISTING COLLECTIONS (safe — never delete)
  // ─────────────────────────────────────────────────────────────

  await ensureCollection(api, 'tenants', 'Tenants', 'storefront', [
    { field: 'name',       type: 'string',    schema: { is_nullable: false, max_length: 255 }, meta: { interface: 'input' } },
    { field: 'slug',       type: 'string',    schema: { is_nullable: false, max_length: 100 }, meta: { interface: 'input' } },
    { field: 'config',     type: 'json',      schema: { is_nullable: true },                  meta: { interface: 'input-code', options: { language: 'json' } } },
    { field: 'created_at', type: 'timestamp', schema: { default_value: 'now()' },             meta: { interface: 'datetime', display: 'datetime' } },
  ]);

  await ensureCollection(api, 'products', 'Products', 'inventory_2', [
    { field: 'name',        type: 'string',  schema: { is_nullable: false, max_length: 255 }, meta: { interface: 'input' } },
    { field: 'price',       type: 'decimal', schema: { is_nullable: false, numeric_precision: 10, numeric_scale: 2 }, meta: { interface: 'input', options: { prefix: '$' } } },
    { field: 'description', type: 'text',    schema: { is_nullable: true },  meta: { interface: 'input-multiline' } },
    { field: 'category',    type: 'string',  schema: { is_nullable: true, max_length: 100 }, meta: { interface: 'input' } },
    { field: 'status',      type: 'string',  schema: { is_nullable: false, default_value: 'draft', max_length: 50 }, meta: { interface: 'select-dropdown', options: { choices: [{ text: 'Published', value: 'published' }, { text: 'Draft', value: 'draft' }, { text: 'Archived', value: 'archived' }] } } },
    { field: 'tenant_id',   type: 'string',  schema: { is_nullable: false, max_length: 100 }, meta: { interface: 'input' } },
    // Phase 1: image field
    { field: 'image',       type: 'uuid',    schema: { is_nullable: true }, meta: { interface: 'file-image', special: ['file'] } },
    { field: 'created_at',  type: 'timestamp', schema: { default_value: 'now()' }, meta: { interface: 'datetime', display: 'datetime' } },
  ]);

  await ensureCollection(api, 'services', 'Services', 'build', [
    { field: 'name',        type: 'string',  schema: { is_nullable: false, max_length: 255 }, meta: { interface: 'input' } },
    { field: 'price',       type: 'decimal', schema: { is_nullable: false, numeric_precision: 10, numeric_scale: 2 }, meta: { interface: 'input', options: { prefix: '$' } } },
    { field: 'duration',    type: 'integer', schema: { is_nullable: false, default_value: 30 }, meta: { interface: 'input', options: { suffix: 'min' } } },
    { field: 'description', type: 'text',    schema: { is_nullable: true }, meta: { interface: 'input-multiline' } },
    { field: 'category',    type: 'string',  schema: { is_nullable: true, max_length: 100 }, meta: { interface: 'input' } },
    { field: 'status',      type: 'string',  schema: { is_nullable: false, default_value: 'active', max_length: 50 }, meta: { interface: 'select-dropdown', options: { choices: [{ text: 'Active', value: 'active' }, { text: 'Inactive', value: 'inactive' }] } } },
    { field: 'tenant_id',   type: 'string',  schema: { is_nullable: false, max_length: 100 }, meta: { interface: 'input' } },
    // Phase 1: image field
    { field: 'image',       type: 'uuid',    schema: { is_nullable: true }, meta: { interface: 'file-image', special: ['file'] } },
    // Phase 2.2: staff assignment
    { field: 'staff_id',    type: 'integer', schema: { is_nullable: true }, meta: { interface: 'input', note: 'FK to staff.id' } },
    { field: 'created_at',  type: 'timestamp', schema: { default_value: 'now()' }, meta: { interface: 'datetime', display: 'datetime' } },
  ]);

  await ensureCollection(api, 'bookings', 'Bookings', 'event', [
    { field: 'customer_name',  type: 'string',   schema: { is_nullable: false, max_length: 255 }, meta: { interface: 'input' } },
    { field: 'customer_phone', type: 'string',   schema: { is_nullable: false, max_length: 50 },  meta: { interface: 'input' } },
    { field: 'customer_email', type: 'string',   schema: { is_nullable: true, max_length: 255 },  meta: { interface: 'input' } },
    { field: 'date',           type: 'dateTime', schema: { is_nullable: false },                  meta: { interface: 'datetime' } },
    { field: 'status',         type: 'string',   schema: { is_nullable: false, default_value: 'pending', max_length: 50 }, meta: { interface: 'select-dropdown', options: { choices: [{ text: 'Pending', value: 'pending' }, { text: 'Confirmed', value: 'confirmed' }, { text: 'Cancelled', value: 'cancelled' }] } } },
    { field: 'service_id',     type: 'string',   schema: { is_nullable: false, max_length: 100 }, meta: { interface: 'input' } },
    { field: 'tenant_id',      type: 'string',   schema: { is_nullable: false, max_length: 100 }, meta: { interface: 'input' } },
    { field: 'notes',          type: 'text',     schema: { is_nullable: true },                   meta: { interface: 'input-multiline' } },
    { field: 'created_at',     type: 'timestamp', schema: { default_value: 'now()' },             meta: { interface: 'datetime', display: 'datetime' } },
  ]);

  await ensureCollection(api, 'orders', 'Orders', 'shopping_cart', [
    { field: 'customer_name',     type: 'string',  schema: { is_nullable: false, max_length: 255 }, meta: { interface: 'input' } },
    { field: 'customer_phone',    type: 'string',  schema: { is_nullable: true, max_length: 50 },   meta: { interface: 'input' } },
    { field: 'customer_email',    type: 'string',  schema: { is_nullable: true, max_length: 255 },  meta: { interface: 'input' } },
    { field: 'total',             type: 'decimal', schema: { is_nullable: false, numeric_precision: 10, numeric_scale: 2 }, meta: { interface: 'input', options: { prefix: '$' } } },
    { field: 'status',            type: 'string',  schema: { is_nullable: false, default_value: 'pending', max_length: 50 }, meta: { interface: 'select-dropdown', options: { choices: [{ text: 'Pending', value: 'pending' }, { text: 'Confirmed', value: 'confirmed' }, { text: 'Processing', value: 'processing' }, { text: 'Shipped', value: 'shipped' }, { text: 'Delivered', value: 'delivered' }, { text: 'Cancelled', value: 'cancelled' }] } } },
    { field: 'items',             type: 'json',    schema: { is_nullable: true },  meta: { interface: 'input-code', options: { language: 'json' } } },
    { field: 'shipping_address',  type: 'json',    schema: { is_nullable: true },  meta: { interface: 'input-code', options: { language: 'json' } } },
    { field: 'tenant_id',         type: 'string',  schema: { is_nullable: false, max_length: 100 }, meta: { interface: 'input' } },
    { field: 'promo_code',        type: 'string',  schema: { is_nullable: true, max_length: 50 },   meta: { interface: 'input' } },
    { field: 'discount_amount',   type: 'decimal', schema: { is_nullable: true, numeric_precision: 10, numeric_scale: 2 }, meta: { interface: 'input' } },
    { field: 'created_at',        type: 'timestamp', schema: { default_value: 'now()' }, meta: { interface: 'datetime', display: 'datetime' } },
  ]);

  // ─────────────────────────────────────────────────────────────
  // PHASE 2.1 — Working Hours
  // ─────────────────────────────────────────────────────────────

  await ensureCollection(api, 'working_hours', 'Working Hours', 'schedule', [
    { field: 'tenant_id',   type: 'string',  schema: { is_nullable: false, max_length: 100 }, meta: { interface: 'input' } },
    { field: 'day_of_week', type: 'integer', schema: { is_nullable: false }, meta: { interface: 'select-dropdown', note: '0=Sun 1=Mon 2=Tue 3=Wed 4=Thu 5=Fri 6=Sat', options: { choices: [{ text: 'Sunday',    value: 0 }, { text: 'Monday',    value: 1 }, { text: 'Tuesday',   value: 2 }, { text: 'Wednesday', value: 3 }, { text: 'Thursday',  value: 4 }, { text: 'Friday',    value: 5 }, { text: 'Saturday',  value: 6 }] } } },
    { field: 'start_time',  type: 'string',  schema: { is_nullable: false, default_value: '09:00', max_length: 5 }, meta: { interface: 'input', note: 'HH:MM' } },
    { field: 'end_time',    type: 'string',  schema: { is_nullable: false, default_value: '18:00', max_length: 5 }, meta: { interface: 'input', note: 'HH:MM' } },
    { field: 'is_day_off',  type: 'boolean', schema: { is_nullable: false, default_value: false }, meta: { interface: 'boolean' } },
  ]);

  // ─────────────────────────────────────────────────────────────
  // PHASE 2.3 — Blocked Dates
  // ─────────────────────────────────────────────────────────────

  await ensureCollection(api, 'blocked_dates', 'Blocked Dates', 'event_busy', [
    { field: 'tenant_id', type: 'string', schema: { is_nullable: false, max_length: 100 }, meta: { interface: 'input' } },
    { field: 'date',      type: 'date',   schema: { is_nullable: false },                  meta: { interface: 'datetime', note: 'YYYY-MM-DD' } },
    { field: 'reason',    type: 'string', schema: { is_nullable: true, max_length: 255 },  meta: { interface: 'input', note: 'e.g. Holiday, Vacation' } },
  ]);

  // ─────────────────────────────────────────────────────────────
  // PHASE 2.2 — Staff / Masters
  // ─────────────────────────────────────────────────────────────

  await ensureCollection(api, 'staff', 'Staff', 'people', [
    { field: 'name',      type: 'string',  schema: { is_nullable: false, max_length: 255 }, meta: { interface: 'input' } },
    { field: 'tenant_id', type: 'string',  schema: { is_nullable: false, max_length: 100 }, meta: { interface: 'input' } },
    { field: 'image',     type: 'uuid',    schema: { is_nullable: true }, meta: { interface: 'file-image', special: ['file'] } },
    { field: 'bio',       type: 'text',    schema: { is_nullable: true }, meta: { interface: 'input-multiline' } },
    { field: 'status',    type: 'string',  schema: { is_nullable: false, default_value: 'active', max_length: 50 }, meta: { interface: 'select-dropdown', options: { choices: [{ text: 'Active', value: 'active' }, { text: 'Inactive', value: 'inactive' }] } } },
  ]);

  // ─────────────────────────────────────────────────────────────
  // PHASE 3.1 — Product Categories
  // ─────────────────────────────────────────────────────────────

  await ensureCollection(api, 'product_categories', 'Product Categories', 'category', [
    { field: 'tenant_id', type: 'string',  schema: { is_nullable: false, max_length: 100 }, meta: { interface: 'input' } },
    { field: 'name',      type: 'string',  schema: { is_nullable: false, max_length: 255 }, meta: { interface: 'input' } },
    { field: 'slug',      type: 'string',  schema: { is_nullable: false, max_length: 100 }, meta: { interface: 'input' } },
    { field: 'image',     type: 'uuid',    schema: { is_nullable: true },                  meta: { interface: 'file-image', special: ['file'] } },
    { field: 'sort',      type: 'integer', schema: { is_nullable: true, default_value: 0 }, meta: { interface: 'input' } },
  ]);

  // Add stock_quantity to products (Phase 3.3)
  await ensureCollection(api, 'products', 'Products', 'inventory_2', [
    { field: 'stock_quantity', type: 'integer', schema: { is_nullable: true, default_value: -1 }, meta: { interface: 'input', note: '-1 = unlimited, 0 = out of stock' } },
  ]);

  // ─────────────────────────────────────────────────────────────
  // PHASE 3.2 — Product Variants
  // ─────────────────────────────────────────────────────────────

  await ensureCollection(api, 'product_variants', 'Product Variants', 'layers', [
    { field: 'product_id',      type: 'string',  schema: { is_nullable: false, max_length: 100 }, meta: { interface: 'input', note: 'FK to products.id' } },
    { field: 'tenant_id',       type: 'string',  schema: { is_nullable: false, max_length: 100 }, meta: { interface: 'input' } },
    { field: 'name',            type: 'string',  schema: { is_nullable: false, max_length: 255 }, meta: { interface: 'input', note: 'e.g. Large, Red' } },
    { field: 'type',            type: 'string',  schema: { is_nullable: false, default_value: 'custom', max_length: 50 }, meta: { interface: 'select-dropdown', options: { choices: [{ text: 'Size', value: 'size' }, { text: 'Color', value: 'color' }, { text: 'Custom', value: 'custom' }] } } },
    { field: 'price_modifier',  type: 'decimal', schema: { is_nullable: false, default_value: 0, numeric_precision: 10, numeric_scale: 2 }, meta: { interface: 'input', note: 'Added to base price' } },
    { field: 'sku',             type: 'string',  schema: { is_nullable: true, max_length: 100 }, meta: { interface: 'input' } },
    { field: 'stock_quantity',  type: 'integer', schema: { is_nullable: false, default_value: -1 }, meta: { interface: 'input', note: '-1 = unlimited' } },
  ]);

  // ─────────────────────────────────────────────────────────────
  // PHASE 3.4 — Promo Codes
  // ─────────────────────────────────────────────────────────────

  await ensureCollection(api, 'promo_codes', 'Promo Codes', 'sell', [
    { field: 'tenant_id',       type: 'string',   schema: { is_nullable: false, max_length: 100 }, meta: { interface: 'input' } },
    { field: 'code',            type: 'string',   schema: { is_nullable: false, max_length: 50 },  meta: { interface: 'input', note: 'Uppercase, unique per tenant' } },
    { field: 'discount_type',   type: 'string',   schema: { is_nullable: false, default_value: 'percent', max_length: 20 }, meta: { interface: 'select-dropdown', options: { choices: [{ text: 'Percent %', value: 'percent' }, { text: 'Fixed $', value: 'fixed' }] } } },
    { field: 'discount_value',  type: 'decimal',  schema: { is_nullable: false, numeric_precision: 10, numeric_scale: 2 }, meta: { interface: 'input' } },
    { field: 'min_order_amount',type: 'decimal',  schema: { is_nullable: false, default_value: 0, numeric_precision: 10, numeric_scale: 2 }, meta: { interface: 'input' } },
    { field: 'max_uses',        type: 'integer',  schema: { is_nullable: false, default_value: -1 }, meta: { interface: 'input', note: '-1 = unlimited' } },
    { field: 'used_count',      type: 'integer',  schema: { is_nullable: false, default_value: 0 }, meta: { interface: 'input' } },
    { field: 'expires_at',      type: 'dateTime', schema: { is_nullable: true },                   meta: { interface: 'datetime' } },
    { field: 'status',          type: 'string',   schema: { is_nullable: false, default_value: 'active', max_length: 50 }, meta: { interface: 'select-dropdown', options: { choices: [{ text: 'Active', value: 'active' }, { text: 'Inactive', value: 'inactive' }] } } },
  ]);

  // ─────────────────────────────────────────────────────────────
  // PHASE 4.1 — Info Products (Infobiz)
  // ─────────────────────────────────────────────────────────────

  await ensureCollection(api, 'info_products', 'Info Products', 'menu_book', [
    { field: 'tenant_id',    type: 'string',  schema: { is_nullable: false, max_length: 100 }, meta: { interface: 'input' } },
    { field: 'name',         type: 'string',  schema: { is_nullable: false, max_length: 255 }, meta: { interface: 'input' } },
    { field: 'slug',         type: 'string',  schema: { is_nullable: false, max_length: 100 }, meta: { interface: 'input' } },
    { field: 'type',         type: 'string',  schema: { is_nullable: false, default_value: 'article', max_length: 50 }, meta: { interface: 'select-dropdown', options: { choices: [{ text: 'Article', value: 'article' }, { text: 'PDF', value: 'pdf' }, { text: 'Course', value: 'course' }, { text: 'Consultation', value: 'consultation' }] } } },
    { field: 'description',  type: 'text',    schema: { is_nullable: true }, meta: { interface: 'input-multiline' } },
    { field: 'content',      type: 'text',    schema: { is_nullable: true }, meta: { interface: 'input-rich-text-md', note: 'For article type — full content' } },
    { field: 'price',        type: 'decimal', schema: { is_nullable: false, default_value: 0, numeric_precision: 10, numeric_scale: 2 }, meta: { interface: 'input', options: { prefix: '$' } } },
    { field: 'image',        type: 'uuid',    schema: { is_nullable: true }, meta: { interface: 'file-image', special: ['file'] } },
    { field: 'file_id',      type: 'uuid',    schema: { is_nullable: true }, meta: { interface: 'file', special: ['file'], note: 'For PDF type — downloadable file' } },
    { field: 'external_url', type: 'string',  schema: { is_nullable: true, max_length: 500 }, meta: { interface: 'input', note: 'For course type — external link' } },
    { field: 'status',       type: 'string',  schema: { is_nullable: false, default_value: 'draft', max_length: 50 }, meta: { interface: 'select-dropdown', options: { choices: [{ text: 'Published', value: 'published' }, { text: 'Draft', value: 'draft' }] } } },
    { field: 'created_at',   type: 'timestamp', schema: { default_value: 'now()' }, meta: { interface: 'datetime', display: 'datetime' } },
  ]);

  // ─────────────────────────────────────────────────────────────
  // PHASE 4.1 — Leads
  // ─────────────────────────────────────────────────────────────

  await ensureCollection(api, 'leads', 'Leads', 'person_add', [
    { field: 'tenant_id',  type: 'string',    schema: { is_nullable: false, max_length: 100 }, meta: { interface: 'input' } },
    { field: 'name',       type: 'string',    schema: { is_nullable: false, max_length: 255 }, meta: { interface: 'input' } },
    { field: 'email',      type: 'string',    schema: { is_nullable: true, max_length: 255 },  meta: { interface: 'input' } },
    { field: 'phone',      type: 'string',    schema: { is_nullable: true, max_length: 50 },   meta: { interface: 'input' } },
    { field: 'source',     type: 'string',    schema: { is_nullable: true, max_length: 255 },  meta: { interface: 'input', note: 'Which page/button triggered this lead' } },
    { field: 'notes',      type: 'text',      schema: { is_nullable: true }, meta: { interface: 'input-multiline' } },
    { field: 'created_at', type: 'timestamp', schema: { default_value: 'now()' }, meta: { interface: 'datetime', display: 'datetime' } },
  ]);

  // ─────────────────────────────────────────────────────────────
  // PHASE 4.1 — Extend orders with infobiz fields
  // ─────────────────────────────────────────────────────────────

  await ensureCollection(api, 'orders', 'Orders', 'shopping_cart', [
    { field: 'type',           type: 'string',  schema: { is_nullable: true, default_value: 'ecommerce', max_length: 50 }, meta: { interface: 'select-dropdown', options: { choices: [{ text: 'Ecommerce', value: 'ecommerce' }, { text: 'Infobiz', value: 'infobiz' }] }, note: 'Order type' } },
    { field: 'product_id',     type: 'string',  schema: { is_nullable: true, max_length: 100 }, meta: { interface: 'input', note: 'FK to info_products.id for infobiz orders' } },
    { field: 'access_granted', type: 'boolean', schema: { is_nullable: false, default_value: false }, meta: { interface: 'boolean', note: 'True after Stars payment confirmed' } },
  ]);

  // ─────────────────────────────────────────────────────────────
  // SEED DATA
  // ─────────────────────────────────────────────────────────────

  console.log('\n📊 Seeding data...\n');

  // Tenants
  await seedItem(api, 'tenants', { name: 'Mario Pizza', slug: 'pizza', config: { theme: { primaryColor: '#FF6B6B', secondaryColor: '#4ECDC4' }, businessType: 'ecommerce', currency: 'USD', locale: 'en' } }, 'slug');
  await seedItem(api, 'tenants', { name: 'Blade & Fade Barbershop', slug: 'barber', config: { theme: { primaryColor: '#1a1a2e', secondaryColor: '#16213e' }, businessType: 'booking', currency: 'USD', locale: 'en' } }, 'slug');
  await seedItem(api, 'tenants', { name: 'Digital Academy', slug: 'academy', config: { theme: { primaryColor: '#6366f1', secondaryColor: '#8b5cf6' }, businessType: 'infobiz', currency: 'USD', locale: 'en' } }, 'slug');

  // Products
  await seedItem(api, 'products', { name: 'Margherita Pizza',  price: 12.99, description: 'Classic Italian pizza with tomato sauce and mozzarella', category: 'Pizza', status: 'published', tenant_id: 'pizza' }, 'name');
  await seedItem(api, 'products', { name: 'Pepperoni Pizza',   price: 14.99, description: 'Loaded with pepperoni and mozzarella cheese',           category: 'Pizza', status: 'published', tenant_id: 'pizza' }, 'name');
  await seedItem(api, 'products', { name: 'Quattro Formaggi',  price: 16.99, description: 'Four cheese pizza: mozzarella, gorgonzola, parmesan',   category: 'Pizza', status: 'published', tenant_id: 'pizza' }, 'name');
  await seedItem(api, 'products', { name: 'Caesar Salad',      price: 9.99,  description: 'Crisp romaine lettuce with parmesan and croutons',      category: 'Salads', status: 'published', tenant_id: 'pizza' }, 'name');
  await seedItem(api, 'products', { name: 'Pasta Carbonara',   price: 13.99, description: 'Spaghetti with egg, pecorino, guanciale, black pepper', category: 'Pasta', status: 'published', tenant_id: 'pizza' }, 'name');

  // Services
  await seedItem(api, 'services', { name: 'Classic Haircut', price: 35.00, duration: 45, description: 'Precision haircut with wash and styling', category: 'Haircut', status: 'active', tenant_id: 'barber' }, 'name');
  await seedItem(api, 'services', { name: 'Beard Trim',      price: 20.00, duration: 30, description: 'Professional beard shaping and oil treatment', category: 'Beard', status: 'active', tenant_id: 'barber' }, 'name');
  await seedItem(api, 'services', { name: 'Full Service',    price: 50.00, duration: 75, description: 'Haircut + beard trim + hot towel treatment', category: 'Combo', status: 'active', tenant_id: 'barber' }, 'name');
  await seedItem(api, 'services', { name: 'Hot Towel Shave', price: 30.00, duration: 45, description: 'Traditional straight razor shave', category: 'Shave', status: 'active', tenant_id: 'barber' }, 'name');

  // Working hours for barber: Mon–Sat 09:00–18:00, Sun closed
  console.log('\n🕐 Seeding working hours for barber...');
  const workingHoursSeed = [
    { tenant_id: 'barber', day_of_week: 0, start_time: '09:00', end_time: '18:00', is_day_off: true  }, // Sun
    { tenant_id: 'barber', day_of_week: 1, start_time: '09:00', end_time: '18:00', is_day_off: false }, // Mon
    { tenant_id: 'barber', day_of_week: 2, start_time: '09:00', end_time: '18:00', is_day_off: false }, // Tue
    { tenant_id: 'barber', day_of_week: 3, start_time: '09:00', end_time: '18:00', is_day_off: false }, // Wed
    { tenant_id: 'barber', day_of_week: 4, start_time: '09:00', end_time: '18:00', is_day_off: false }, // Thu
    { tenant_id: 'barber', day_of_week: 5, start_time: '09:00', end_time: '18:00', is_day_off: false }, // Fri
    { tenant_id: 'barber', day_of_week: 6, start_time: '10:00', end_time: '16:00', is_day_off: false }, // Sat (shorter hours)
  ];
  for (const wh of workingHoursSeed) {
    // Check by tenant_id + day_of_week combo
    try {
      const existing = await api.get('/items/working_hours', {
        params: { filter: { tenant_id: { _eq: wh.tenant_id }, day_of_week: { _eq: wh.day_of_week } }, limit: 1 },
      });
      if (existing.data.data.length > 0) {
        const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
        console.log(`   ⏭️  ${dayNames[wh.day_of_week]} already exists`);
        continue;
      }
    } catch { /* collection may be new */ }
    try {
      await api.post('/items/working_hours', wh);
      const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
      const status = wh.is_day_off ? '(closed)' : `${wh.start_time}–${wh.end_time}`;
      console.log(`   ✅ ${dayNames[wh.day_of_week]} ${status}`);
    } catch (e: any) {
      console.log(`   ⚠️  Could not create: ${e.response?.data?.errors?.[0]?.message || e.message}`);
    }
  }

  // Staff for barber
  console.log('\n👤 Seeding staff for barber...');
  await seedItem(api, 'staff', { name: 'Alex Johnson', tenant_id: 'barber', bio: 'Senior barber with 10 years of experience', status: 'active' }, 'name');
  await seedItem(api, 'staff', { name: 'Mike Williams', tenant_id: 'barber', bio: 'Specialist in classic cuts and hot towel shaves', status: 'active' }, 'name');

  // Promo codes
  console.log('\n🎟️ Seeding promo codes...');
  await seedItem(api, 'promo_codes', { tenant_id: 'pizza', code: 'PIZZA10', discount_type: 'percent', discount_value: 10, min_order_amount: 0, max_uses: -1, used_count: 0, status: 'active' }, 'code');
  await seedItem(api, 'promo_codes', { tenant_id: 'pizza', code: 'SAVE5', discount_type: 'fixed', discount_value: 5, min_order_amount: 20, max_uses: -1, used_count: 0, status: 'active' }, 'code');

  // Info products for academy
  console.log('\n📚 Seeding info products for academy...');
  await seedItem(api, 'info_products', { tenant_id: 'academy', name: 'Telegram Mini App Guide', slug: 'tma-guide', type: 'pdf', description: 'Complete guide to building Telegram Mini Apps from scratch. 80+ pages of practical content.', price: 19, status: 'published' }, 'slug');
  await seedItem(api, 'info_products', { tenant_id: 'academy', name: 'No-Code Business Automation', slug: 'nocode-automation', type: 'course', description: 'Learn to automate your business without writing a single line of code. Video course, 12 lessons.', price: 49, external_url: 'https://example.com/courses/nocode', status: 'published' }, 'slug');
  await seedItem(api, 'info_products', { tenant_id: 'academy', name: 'Monetization Strategy for Telegram', slug: 'monetization-strategy', type: 'article', description: 'Free article: 7 proven ways to monetize your Telegram channel in 2026.', content: '# Monetization Strategy\n\nTelegram has become one of the most powerful platforms for creators...\n\n## 1. Paid Subscriptions\n\nOffer exclusive content to paying subscribers.\n\n## 2. Digital Products\n\nSell PDFs, courses, and templates directly in your channel.\n\n## 3. Consulting\n\nOffer 1:1 consulting sessions to your audience.', price: 0, status: 'published' }, 'slug');
  await seedItem(api, 'info_products', { tenant_id: 'academy', name: '1:1 Strategy Session', slug: 'strategy-session', type: 'consultation', description: '60-minute one-on-one session to review your business idea and build an action plan.', price: 99, status: 'published' }, 'slug');

  console.log('\n✅ Database initialized!\n');
  console.log('📋 Collections ready:');
  console.log('   • tenants, products, services, bookings, orders');
  console.log('   • working_hours (Phase 2.1)');
  console.log('   • blocked_dates (Phase 2.3)');
  console.log('   • staff (Phase 2.2)');
  console.log('   • product_categories, product_variants, promo_codes (Phase 3)');
  console.log('   • info_products, leads (Phase 4)');
}

main().catch(e => {
  console.error('❌ Error:', e.response?.data || e.message);
  process.exit(1);
});
