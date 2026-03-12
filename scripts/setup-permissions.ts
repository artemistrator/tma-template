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

async function main() {
  console.log('Setting up permissions...');
  const api = await createApi();
  
  // Get admin role ID
  const userResponse = await api.get('/users/me?fields=role.id');
  const roleId = userResponse.data.data.role.id;
  console.log('Admin role ID:', roleId);
  
  // Create permissions for each collection
  const collections = ['tenants', 'products', 'orders'];
  
  for (const collection of collections) {
    console.log(`\nCreating permissions for ${collection}...`);
    
    try {
      // Create full permissions for admin role
      await api.post('/permissions', {
        role: roleId,
        collection: collection,
        action: 'read',
        permissions: {},
        validation: {},
        presets: {},
        fields: ['*'],
      });
      console.log(`  ✅ Read permission created`);
      
      await api.post('/permissions', {
        role: roleId,
        collection: collection,
        action: 'create',
        permissions: {},
        validation: {},
        presets: {},
        fields: ['*'],
      });
      console.log(`  ✅ Create permission created`);
      
      await api.post('/permissions', {
        role: roleId,
        collection: collection,
        action: 'update',
        permissions: {},
        validation: {},
        presets: {},
        fields: ['*'],
      });
      console.log(`  ✅ Update permission created`);
      
      await api.post('/permissions', {
        role: roleId,
        collection: collection,
        action: 'delete',
        permissions: {},
        validation: {},
        presets: {},
        fields: ['*'],
      });
      console.log(`  ✅ Delete permission created`);
    } catch (e: any) {
      console.warn(`  Warning: ${e.response?.data?.message || e.message}`);
    }
  }
  
  console.log('\n✅ Permissions setup complete!');
}

main().catch(console.error);
