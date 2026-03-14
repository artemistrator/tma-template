import axios from 'axios';
import dotenv from 'dotenv';
import { join } from 'path';

dotenv.config({ path: join(__dirname, '..', '.env.local'), override: true });

const DIRECTUS_URL = process.env.DIRECTUS_URL || 'http://localhost:8055';
const ADMIN_EMAIL = process.env.DIRECTUS_ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.DIRECTUS_ADMIN_PASSWORD || 'admin';

async function createApi() {
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

async function createCollection(api: any, id: string, name: string, icon: string, fields: any[]) {
  console.log(`\n📁 Creating ${name}...`);
  try {
    await api.delete(`/collections/${id}`).catch(() => {});
    await api.post('/collections', {
      collection: id,
      meta: { collection: id, icon, singleton: false, accountability: 'all' },
      schema: { name: id },
    });
    console.log(`   ✅ Collection created`);
  } catch (e: any) {
    console.log(`   ⚠️  Collection may exist`);
  }
  
  for (const field of fields) {
    try {
      await api.post(`/collections/${id}/fields`, {
        field: field.field,
        type: field.type,
        schema: field.schema || {},
        meta: field.meta || {},
      });
      console.log(`   ✅ Field: ${field.field}`);
    } catch (e: any) {
      // Field may exist
    }
  }
}

async function seedItem(api: any, collection: string, data: any, uniqueField: string) {
  const existing = await api.get(`/items/${collection}`, {
    params: { filter: { [uniqueField]: { _eq: data[uniqueField] } }, limit: 1 }
  });
  if (existing.data.data.length > 0) {
    console.log(`   ⏭️  ${data[uniqueField]} exists`);
    return;
  }
  await api.post(`/items/${collection}`, data);
  console.log(`   ✅ ${data[uniqueField]} created`);
}

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║       Directus Database Initialization                    ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
  
  const api = await createApi();
  
  // Create collections
  await createCollection(api, 'tenants', 'Tenants', 'storefront', [
    { field: 'name', type: 'string', schema: { is_nullable: false, max_length: 255 }, meta: { interface: 'input' } },
    { field: 'slug', type: 'string', schema: { is_nullable: false, max_length: 100 }, meta: { interface: 'input' } },
    { field: 'config', type: 'json', schema: { is_nullable: true }, meta: { interface: 'input-code', options: { language: 'json' } } },
    { field: 'created_at', type: 'timestamp', schema: { default_value: 'now()' }, meta: { interface: 'datetime', display: 'datetime' } },
  ]);
  
  await createCollection(api, 'products', 'Products', 'inventory_2', [
    { field: 'name', type: 'string', schema: { is_nullable: false, max_length: 255 }, meta: { interface: 'input' } },
    { field: 'price', type: 'decimal', schema: { is_nullable: false, numeric_precision: 10, numeric_scale: 2 }, meta: { interface: 'input', options: { prefix: '$' } } },
    { field: 'description', type: 'text', schema: { is_nullable: true }, meta: { interface: 'input-multiline' } },
    { field: 'category', type: 'string', schema: { is_nullable: true, max_length: 100 }, meta: { interface: 'input' } },
    { field: 'status', type: 'string', schema: { is_nullable: false, default_value: 'draft', max_length: 50 }, meta: { interface: 'select-dropdown', options: { choices: [{ text: 'Published', value: 'published' }, { text: 'Draft', value: 'draft' }, { text: 'Archived', value: 'archived' }] } } },
    { field: 'tenant_id', type: 'string', schema: { is_nullable: false, max_length: 100 }, meta: { interface: 'input' } },
    { field: 'created_at', type: 'timestamp', schema: { default_value: 'now()' }, meta: { interface: 'datetime', display: 'datetime' } },
  ]);
  
  await createCollection(api, 'services', 'Services', 'build', [
    { field: 'name', type: 'string', schema: { is_nullable: false, max_length: 255 }, meta: { interface: 'input' } },
    { field: 'price', type: 'decimal', schema: { is_nullable: false, numeric_precision: 10, numeric_scale: 2 }, meta: { interface: 'input', options: { prefix: '$' } } },
    { field: 'duration', type: 'integer', schema: { is_nullable: false, default_value: 30 }, meta: { interface: 'input', options: { suffix: 'min' } } },
    { field: 'description', type: 'text', schema: { is_nullable: true }, meta: { interface: 'input-multiline' } },
    { field: 'category', type: 'string', schema: { is_nullable: true, max_length: 100 }, meta: { interface: 'input' } },
    { field: 'status', type: 'string', schema: { is_nullable: false, default_value: 'active', max_length: 50 }, meta: { interface: 'select-dropdown', options: { choices: [{ text: 'Active', value: 'active' }, { text: 'Inactive', value: 'inactive' }] } } },
    { field: 'tenant_id', type: 'string', schema: { is_nullable: false, max_length: 100 }, meta: { interface: 'input' } },
    { field: 'created_at', type: 'timestamp', schema: { default_value: 'now()' }, meta: { interface: 'datetime', display: 'datetime' } },
  ]);
  
  await createCollection(api, 'bookings', 'Bookings', 'event', [
    { field: 'customer_name', type: 'string', schema: { is_nullable: false, max_length: 255 }, meta: { interface: 'input' } },
    { field: 'customer_phone', type: 'string', schema: { is_nullable: false, max_length: 50 }, meta: { interface: 'input' } },
    { field: 'customer_email', type: 'string', schema: { is_nullable: true, max_length: 255 }, meta: { interface: 'input' } },
    { field: 'date', type: 'dateTime', schema: { is_nullable: false }, meta: { interface: 'datetime' } },
    { field: 'status', type: 'string', schema: { is_nullable: false, default_value: 'pending', max_length: 50 }, meta: { interface: 'select-dropdown', options: { choices: [{ text: 'Pending', value: 'pending' }, { text: 'Confirmed', value: 'confirmed' }, { text: 'Cancelled', value: 'cancelled' }] } } },
    { field: 'service_id', type: 'string', schema: { is_nullable: false, max_length: 100 }, meta: { interface: 'input' } },
    { field: 'tenant_id', type: 'string', schema: { is_nullable: false, max_length: 100 }, meta: { interface: 'input' } },
    { field: 'notes', type: 'text', schema: { is_nullable: true }, meta: { interface: 'input-multiline' } },
    { field: 'created_at', type: 'timestamp', schema: { default_value: 'now()' }, meta: { interface: 'datetime', display: 'datetime' } },
  ]);
  
  // Seed data
  console.log('\n📊 Seeding data...\n');
  
  await seedItem(api, 'tenants', {
    name: 'Mario Pizza',
    slug: 'pizza',
    config: { theme: { primaryColor: '#FF6B6B', secondaryColor: '#4ECDC4' }, businessType: 'ecommerce' },
  }, 'slug');
  
  await seedItem(api, 'tenants', {
    name: 'Blade & Fade Barbershop',
    slug: 'barber',
    config: { theme: { primaryColor: '#1a1a2e', secondaryColor: '#16213e' }, businessType: 'booking' },
  }, 'slug');
  
  await seedItem(api, 'products', { name: 'Margherita Pizza', price: 12.99, description: 'Classic Italian pizza', category: 'Pizza', status: 'published', tenant_id: 'pizza' }, 'name');
  await seedItem(api, 'products', { name: 'Pepperoni Pizza', price: 14.99, description: 'With pepperoni', category: 'Pizza', status: 'published', tenant_id: 'pizza' }, 'name');
  await seedItem(api, 'products', { name: 'Quattro Formaggi', price: 16.99, description: 'Four cheese pizza', category: 'Pizza', status: 'published', tenant_id: 'pizza' }, 'name');
  await seedItem(api, 'products', { name: 'Caesar Salad', price: 9.99, description: 'Crisp romaine', category: 'Salads', status: 'published', tenant_id: 'pizza' }, 'name');
  
  await seedItem(api, 'services', { name: 'Classic Haircut', price: 35.00, duration: 45, description: 'Precision haircut', category: 'Haircut', status: 'active', tenant_id: 'barber' }, 'name');
  await seedItem(api, 'services', { name: 'Beard Trim', price: 20.00, duration: 30, description: 'Beard shaping', category: 'Beard', status: 'active', tenant_id: 'barber' }, 'name');
  await seedItem(api, 'services', { name: 'Full Service', price: 50.00, duration: 75, description: 'Haircut + beard', category: 'Combo', status: 'active', tenant_id: 'barber' }, 'name');
  await seedItem(api, 'services', { name: 'Hot Towel Shave', price: 30.00, duration: 45, description: 'Traditional shave', category: 'Shave', status: 'active', tenant_id: 'barber' }, 'name');
  
  console.log('\n✅ Database initialized!\n');
}

main().catch(e => {
  console.error('❌ Error:', e.response?.data || e.message);
  process.exit(1);
});
