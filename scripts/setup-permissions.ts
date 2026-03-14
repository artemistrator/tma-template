import axios from 'axios';
import dotenv from 'dotenv';
import { join } from 'path';

dotenv.config({ path: join(__dirname, '..', '.env.local'), override: true });

const DIRECTUS_URL = process.env.DIRECTUS_URL || 'http://localhost:8055';
const ADMIN_EMAIL = process.env.DIRECTUS_ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.DIRECTUS_ADMIN_PASSWORD || 'admin';

async function main() {
  console.log('🔐 Logging in...');
  const auth = await axios.post(`${DIRECTUS_URL}/auth/login`, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  const token = auth.data.data.access_token;
  const api = axios.create({ baseURL: DIRECTUS_URL });
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  console.log('✅ Logged in\n');

  // Get admin role
  const user = await api.get('/users/me?fields=role.id');
  const roleId = user.data.data.role.id;
  console.log(`Admin role: ${roleId}\n`);

  // Setup permissions for each collection
  const collections = ['tenants', 'products', 'services', 'bookings', 'orders'];
  
  for (const collection of collections) {
    console.log(`📋 Setting up permissions for "${collection}"...`);
    
    const actions = ['read', 'create', 'update', 'delete'];
    for (const action of actions) {
      try {
        await api.post('/permissions', {
          role: roleId,
          collection: collection,
          action: action,
          permissions: {},
          validation: {},
          presets: {},
          fields: ['*'],
        });
        console.log(`   ✅ ${action}`);
      } catch (e: any) {
        console.log(`   ⚠️  ${action} may exist`);
      }
    }
  }
  
  console.log('\n✅ Permissions setup complete!\n');
}

main().catch(e => console.error('❌ Error:', e.response?.data || e.message));

  // System collections permissions
  console.log('📋 Setting up system permissions...');
  const systemCollections = ['directus_fields', 'directus_collections', 'directus_relations'];
  for (const collection of systemCollections) {
    try {
      await api.post('/permissions', {
        role: roleId,
        collection: collection,
        action: 'read',
        permissions: {},
        validation: {},
        presets: {},
        fields: ['*'],
      });
      console.log(`   ✅ ${collection}: read`);
    } catch (e: any) {
      console.log(`   ⚠️  ${collection} may exist`);
    }
  }
