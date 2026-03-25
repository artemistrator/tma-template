import axios from 'axios';
import dotenv from 'dotenv';
import { join } from 'path';

dotenv.config({ path: join(__dirname, '..', '.env.local') });

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

  // Get public role (null role = public in Directus)
  // We set permissions for the PUBLIC role (unauthenticated users)
  console.log('🔎 Getting public role...');
  const rolesResp = await api.get('/roles?filter[name][_eq]=Public&limit=1');
  const publicRoleId: string | null = rolesResp.data.data?.[0]?.id ?? null;
  if (publicRoleId) {
    console.log(`   Public role id: ${publicRoleId}`);
  } else {
    console.log('   ℹ️  No public role found, permissions will be set for null (global public)');
  }

  // ── Collections that the public (unauthenticated) user needs to READ ──
  const publicReadCollections = [
    'tenants',
    'products',
    'services',
    'working_hours',
    'blocked_dates',
    'staff',
    'product_categories', // Phase 3.1
    'product_variants',   // Phase 3.2
    'info_products',      // Phase 4.1
    'directus_files',     // needed for image proxying
  ];

  // ── Collections that the public user needs to CREATE (form submissions) ──
  const publicCreateCollections = [
    'bookings',
    'orders',
    'leads',              // Phase 4.1
  ];

  // ── Full CRUD for admin role ──
  const adminCollections = [
    'tenants',
    'products',
    'services',
    'bookings',
    'orders',
    'working_hours',
    'blocked_dates',
    'staff',
    'product_categories', // Phase 3.1
    'product_variants',   // Phase 3.2
    'promo_codes',        // Phase 3.4
    'info_products',      // Phase 4.1
    'leads',              // Phase 4.1
  ];

  // Helper: upsert permission
  async function setPermission(role: string | null, collection: string, action: string) {
    try {
      await api.post('/permissions', {
        role,
        collection,
        action,
        permissions: {},
        validation: {},
        presets: {},
        fields: ['*'],
      });
      console.log(`   ✅ ${collection}: ${action}`);
    } catch {
      // Already exists
      console.log(`   ⏭️  ${collection}: ${action} (exists)`);
    }
  }

  // ── Public role READ permissions ──
  console.log('\n📋 Public role — READ permissions...');
  for (const col of publicReadCollections) {
    await setPermission(publicRoleId, col, 'read');
  }

  // ── Public role CREATE permissions ──
  console.log('\n📋 Public role — CREATE permissions...');
  for (const col of publicCreateCollections) {
    await setPermission(publicRoleId, col, 'create');
  }

  // ── Admin role — full CRUD ──
  console.log('\n📋 Admin role — full CRUD permissions...');
  // Get admin role id
  const adminUser = await api.get('/users/me?fields=role.id');
  const adminRoleId: string = adminUser.data.data.role.id;
  console.log(`   Admin role id: ${adminRoleId}`);

  for (const col of adminCollections) {
    for (const action of ['read', 'create', 'update', 'delete']) {
      await setPermission(adminRoleId, col, action);
    }
  }

  // ── System collections (read-only for public) ──
  console.log('\n📋 System collections — READ for public...');
  for (const col of ['directus_fields', 'directus_collections', 'directus_relations']) {
    await setPermission(publicRoleId, col, 'read');
  }

  console.log('\n✅ Permissions setup complete!\n');
  console.log('📋 Summary:');
  console.log('   Public READ:', publicReadCollections.join(', '));
  console.log('   Public CREATE:', publicCreateCollections.join(', '));
  console.log('   Admin CRUD:', adminCollections.join(', '));
}

main().catch(e => {
  console.error('❌ Error:', e.response?.data || e.message);
  process.exit(1);
});
