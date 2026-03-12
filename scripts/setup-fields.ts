import axios from 'axios';
import dotenv from 'dotenv';
import { join } from 'path';

dotenv.config({ path: join(__dirname, '..', '.env.local'), override: true });

const DIRECTUS_URL = process.env.DIRECTUS_URL || 'http://localhost:8055';
const ADMIN_EMAIL = process.env.DIRECTUS_ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.DIRECTUS_ADMIN_PASSWORD || 'admin';

async function createApi() {
  const response = await axios.post(`${DIRECTUS_URL}/auth/login`, {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });
  
  const token = response.data.data.access_token;
  const api = axios.create({ baseURL: DIRECTUS_URL });
  api.defaults.headers.common['Content-Type'] = 'application/json';
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  return api;
}

async function createField(api: any, collection: string, field: any) {
  try {
    await api.post('/fields', {
      collection: collection,
      field: field.field,
      type: field.type,
      schema: field.schema,
      meta: field.meta,
    });
    console.log(`   ✅ ${collection}.${field.field} created (${field.type})`);
  } catch (e: any) {
    const msg = e.response?.data?.message || e.message;
    if (msg.includes('already exists')) {
      console.log(`   ⏭️  ${collection}.${field.field} exists`);
    } else {
      console.error(`   ❌ ${collection}.${field.field}: ${msg}`);
    }
  }
}

async function main() {
  console.log('Setting up fields...\n');
  const api = await createApi();
  
  // Tenants fields
  console.log('🏢 Collection: tenants');
  const tenantFields = [
    { field: 'name', type: 'string', schema: { is_nullable: false, max_length: 255 }, meta: { interface: 'input' } },
    { field: 'slug', type: 'string', schema: { is_nullable: false, max_length: 100 }, meta: { interface: 'input' } },
    { field: 'config', type: 'json', schema: { is_nullable: true }, meta: { interface: 'input-code', options: { language: 'json' } } },
    { field: 'created_at', type: 'timestamp', schema: { default_value: 'now()' }, meta: { interface: 'datetime', display: 'datetime' } },
  ];
  for (const f of tenantFields) await createField(api, 'tenants', f);
  
  // Products fields
  console.log('\n📦 Collection: products');
  const productFields = [
    { field: 'name', type: 'string', schema: { is_nullable: false, max_length: 255 }, meta: { interface: 'input' } },
    { field: 'price', type: 'decimal', schema: { is_nullable: false, numeric_precision: 10, numeric_scale: 2 }, meta: { interface: 'input', options: { prefix: '$' } } },
    { field: 'description', type: 'text', schema: { is_nullable: true }, meta: { interface: 'input-multiline' } },
    { field: 'image', type: 'uuid', schema: { is_nullable: true }, meta: { interface: 'file-image', display: 'file' } },
    { field: 'category', type: 'string', schema: { is_nullable: true, max_length: 100 }, meta: { interface: 'input' } },
    { field: 'status', type: 'string', schema: { is_nullable: false, default_value: 'draft', max_length: 50 }, meta: { interface: 'select-dropdown', options: { choices: [{ text: 'Draft', value: 'draft' }, { text: 'Published', value: 'published' }, { text: 'Archived', value: 'archived' }] } } },
    { field: 'tenant_id', type: 'string', schema: { is_nullable: false, max_length: 100 }, meta: { interface: 'input' } },
    { field: 'created_at', type: 'timestamp', schema: { default_value: 'now()' }, meta: { interface: 'datetime', display: 'datetime' } },
  ];
  for (const f of productFields) await createField(api, 'products', f);
  
  // Orders fields
  console.log('\n🛒 Collection: orders');
  const orderFields = [
    { field: 'customer_name', type: 'string', schema: { is_nullable: false, max_length: 255 }, meta: { interface: 'input' } },
    { field: 'customer_phone', type: 'string', schema: { is_nullable: true, max_length: 50 }, meta: { interface: 'input' } },
    { field: 'customer_email', type: 'string', schema: { is_nullable: true, max_length: 255 }, meta: { interface: 'input' } },
    { field: 'total', type: 'decimal', schema: { is_nullable: false, numeric_precision: 10, numeric_scale: 2 }, meta: { interface: 'input', options: { prefix: '$' } } },
    { field: 'status', type: 'string', schema: { is_nullable: false, default_value: 'pending', max_length: 50 }, meta: { interface: 'select-dropdown', options: { choices: [{ text: 'Pending', value: 'pending' }, { text: 'Confirmed', value: 'confirmed' }, { text: 'Processing', value: 'processing' }, { text: 'Shipped', value: 'shipped' }, { text: 'Delivered', value: 'delivered' }, { text: 'Cancelled', value: 'cancelled' }] } } },
    { field: 'items', type: 'json', schema: { is_nullable: true }, meta: { interface: 'input-code', options: { language: 'json' } } },
    { field: 'shipping_address', type: 'json', schema: { is_nullable: true }, meta: { interface: 'input-code', options: { language: 'json' } } },
    { field: 'tenant_id', type: 'string', schema: { is_nullable: false, max_length: 100 }, meta: { interface: 'input' } },
    { field: 'created_at', type: 'timestamp', schema: { default_value: 'now()' }, meta: { interface: 'datetime', display: 'datetime' } },
  ];
  for (const f of orderFields) await createField(api, 'orders', f);
  
  console.log('\n✅ Fields setup complete!');
}

main().catch(console.error);
