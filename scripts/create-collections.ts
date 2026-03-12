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

async function createCollection(api: any, id: string, name: string, icon: string) {
  try {
    await api.get(`/collections/${id}`);
    console.log(`⏭️  ${name} exists`);
    return;
  } catch (e: any) {
    // Directus returns 403 instead of 404 for non-existent collections (security feature)
    if (e.response?.status === 404 || e.response?.status === 403) {
      // Collection doesn't exist, create it
    } else {
      throw e;
    }
  }
  
  await api.post('/collections', {
    collection: id,
    meta: { collection: id, icon },
    schema: { name: id },
  });
  console.log(`✅ ${name} created`);
}

async function main() {
  console.log('Creating collections...');
  const api = await createApi();
  await createCollection(api, 'tenants', 'Tenants', 'storefront');
  await createCollection(api, 'products', 'Products', 'inventory_2');
  await createCollection(api, 'orders', 'Orders', 'shopping_cart');
  console.log('Done!');
}

main().catch(console.error);
