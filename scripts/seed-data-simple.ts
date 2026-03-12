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

async function seedItem(api: any, collection: string, data: any, uniqueField: string, name: string) {
  // Check if exists
  const existing = await api.get(`/items/${collection}`, {
    params: { filter: { [uniqueField]: { _eq: data[uniqueField] } } }
  });
  
  if (existing.data.data.length > 0) {
    console.log(`⏭️  ${name} exists`);
    return existing.data.data[0].id;
  }
  
  // Create
  const result = await api.post(`/items/${collection}`, data);
  console.log(`✅ ${name} created (id: ${result.data.data.id})`);
  return result.data.data.id;
}

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║       Directus Database Seed Script                       ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
  
  const api = await createApi();
  
  // Seed tenants
  console.log('🏢 Creating tenants...\n');
  const pizzaTenantId = await seedItem(api, 'tenants', {
    name: 'Mario Pizza',
    slug: 'pizza',
    config: { theme: { primaryColor: '#FF6B6B', secondaryColor: '#4ECDC4' }, businessType: 'ecommerce' },
  }, 'slug', 'Mario Pizza');
  
  const barberTenantId = await seedItem(api, 'tenants', {
    name: 'Blade & Fade Barbershop',
    slug: 'barber',
    config: { theme: { primaryColor: '#1a1a2e', secondaryColor: '#16213e' }, businessType: 'booking' },
  }, 'slug', 'Blade & Fade');
  
  // Seed products
  console.log('\n🍕 Creating products...\n');
  const products = [
    { name: 'Margherita Pizza', price: 12.99, description: 'Classic Italian pizza', category: 'Pizza', status: 'published', tenant_id: 'pizza' },
    { name: 'Pepperoni Pizza', price: 14.99, description: 'With pepperoni', category: 'Pizza', status: 'published', tenant_id: 'pizza' },
    { name: 'Quattro Formaggi', price: 16.99, description: 'Four cheese pizza', category: 'Pizza', status: 'published', tenant_id: 'pizza' },
    { name: 'Caesar Salad', price: 9.99, description: 'Crisp romaine lettuce', category: 'Salads', status: 'published', tenant_id: 'pizza' },
  ];
  
  for (const p of products) {
    await seedItem(api, 'products', p, 'name', p.name);
  }
  
  console.log('\n✂️  Creating barber services...\n');
  const services = [
    { name: 'Classic Haircut', price: 35.00, description: 'Precision haircut', category: 'Haircut', status: 'published', tenant_id: 'barber' },
    { name: 'Beard Trim', price: 20.00, description: 'Beard shaping', category: 'Beard', status: 'published', tenant_id: 'barber' },
    { name: 'Full Service', price: 50.00, description: 'Haircut + beard trim', category: 'Combo', status: 'published', tenant_id: 'barber' },
  ];
  
  for (const s of services) {
    await seedItem(api, 'products', s, 'name', s.name);
  }
  
  console.log('\n✅ Database seeding complete!');
  console.log('\n📊 Summary:');
  console.log('   Tenants: 2 (pizza, barber)');
  console.log('   Products: 7 (4 pizza + 3 barber)');
}

main().catch(e => {
  console.error('\n❌ Script failed:', e.response?.data || e.message);
  process.exit(1);
});
