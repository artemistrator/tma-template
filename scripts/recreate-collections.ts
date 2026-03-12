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

async function recreateCollection(api: any, id: string, name: string, icon: string, fields: any[]) {
  console.log(`\n📁 Setting up ${name}...`);
  
  // Delete if exists
  try {
    await api.delete(`/collections/${id}`);
    console.log(`   🗑️  Deleted existing collection`);
  } catch (e: any) {
    // Ignore errors
  }
  
  // Create collection with schema
  try {
    await api.post('/collections', {
      collection: id,
      meta: { 
        collection: id, 
        icon,
        singleton: false,
        accountability: 'all',
      },
      schema: { 
        name: id,
        comment: `${name} collection`,
      },
    });
    console.log(`   ✅ Collection created`);
  } catch (e: any) {
    console.error(`   ❌ Collection: ${e.response?.data?.message || e.message}`);
    return;
  }
  
  // Create fields
  for (const field of fields) {
    try {
      await api.post('/fields', {
        collection: id,
        field: field.field,
        type: field.type,
        schema: field.schema || {},
        meta: field.meta || {},
      });
      console.log(`   ✅ Field: ${field.field} (${field.type})`);
    } catch (e: any) {
      console.error(`   ❌ Field ${field.field}: ${e.response?.data?.message || e.message}`);
    }
  }
}

async function main() {
  console.log('Recreating collections with proper schema...\n');
  const api = await createApi();
  
  await recreateCollection(api, 'tenants', 'Tenants', 'storefront', [
    { field: 'name', type: 'string', schema: { is_nullable: false, max_length: 255 }, meta: { interface: 'input' } },
    { field: 'slug', type: 'string', schema: { is_nullable: false, max_length: 100 }, meta: { interface: 'input' } },
    { field: 'config', type: 'json', schema: { is_nullable: true }, meta: { interface: 'input-code', options: { language: 'json' } } },
    { field: 'created_at', type: 'timestamp', schema: { default_value: 'now()' }, meta: { interface: 'datetime', display: 'datetime' } },
  ]);
  
  await recreateCollection(api, 'products', 'Products', 'inventory_2', [
    { field: 'name', type: 'string', schema: { is_nullable: false, max_length: 255 }, meta: { interface: 'input' } },
    { field: 'price', type: 'decimal', schema: { is_nullable: false, numeric_precision: 10, numeric_scale: 2 }, meta: { interface: 'input', options: { prefix: '$' } } },
    { field: 'description', type: 'text', schema: { is_nullable: true }, meta: { interface: 'input-multiline' } },
    { field: 'category', type: 'string', schema: { is_nullable: true, max_length: 100 }, meta: { interface: 'input' } },
    { field: 'status', type: 'string', schema: { is_nullable: false, default_value: 'draft', max_length: 50 }, meta: { interface: 'select-dropdown', options: { choices: [{ text: 'Draft', value: 'draft' }, { text: 'Published', value: 'published' }, { text: 'Archived', value: 'archived' }] } } },
    { field: 'tenant_id', type: 'string', schema: { is_nullable: false, max_length: 100 }, meta: { interface: 'input' } },
    { field: 'created_at', type: 'timestamp', schema: { default_value: 'now()' }, meta: { interface: 'datetime', display: 'datetime' } },
  ]);
  
  await recreateCollection(api, 'orders', 'Orders', 'shopping_cart', [
    { field: 'customer_name', type: 'string', schema: { is_nullable: false, max_length: 255 }, meta: { interface: 'input' } },
    { field: 'customer_phone', type: 'string', schema: { is_nullable: true, max_length: 50 }, meta: { interface: 'input' } },
    { field: 'customer_email', type: 'string', schema: { is_nullable: true, max_length: 255 }, meta: { interface: 'input' } },
    { field: 'total', type: 'decimal', schema: { is_nullable: false, numeric_precision: 10, numeric_scale: 2 }, meta: { interface: 'input', options: { prefix: '$' } } },
    { field: 'status', type: 'string', schema: { is_nullable: false, default_value: 'pending', max_length: 50 }, meta: { interface: 'select-dropdown', options: { choices: [{ text: 'Pending', value: 'pending' }, { text: 'Confirmed', value: 'confirmed' }, { text: 'Processing', value: 'processing' }, { text: 'Shipped', value: 'shipped' }, { text: 'Delivered', value: 'delivered' }, { text: 'Cancelled', value: 'cancelled' }] } } },
    { field: 'items', type: 'json', schema: { is_nullable: true }, meta: { interface: 'input-code', options: { language: 'json' } } },
    { field: 'shipping_address', type: 'json', schema: { is_nullable: true }, meta: { interface: 'input-code', options: { language: 'json' } } },
    { field: 'tenant_id', type: 'string', schema: { is_nullable: false, max_length: 100 }, meta: { interface: 'input' } },
    { field: 'created_at', type: 'timestamp', schema: { default_value: 'now()' }, meta: { interface: 'datetime', display: 'datetime' } },
  ]);
  
  console.log('\n✅ Collections recreated!');
}

main().catch(console.error);
