import axios from 'axios';
import dotenv from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
  console.log('Adding tenant_admins schema to Directus...\n');
  const api = await createApi();

  const collectionId = 'tenant_admins';

  // Check if already exists
  try {
    await api.get(`/collections/${collectionId}`);
    console.log('Collection tenant_admins already exists. Skipping creation.');
    console.log('To recreate, delete it first in Directus admin.');
    return;
  } catch {
    // Does not exist — create it
  }

  // Create collection
  try {
    await api.post('/collections', {
      collection: collectionId,
      meta: {
        collection: collectionId,
        icon: 'admin_panel_settings',
        singleton: false,
        accountability: 'all',
      },
      schema: {
        name: collectionId,
        comment: 'Tenant admin users (business owners and managers)',
      },
    });
    console.log('Collection created');
  } catch (e: any) {
    console.error('Failed to create collection:', e.response?.data?.message || e.message);
    return;
  }

  // Create fields
  const fields = [
    {
      field: 'tenant_id',
      type: 'string',
      schema: { is_nullable: false, max_length: 100 },
      meta: { interface: 'input', note: 'Tenant slug (e.g. "pizza", "barber")' },
    },
    {
      field: 'telegram_id',
      type: 'bigInteger',
      schema: { is_nullable: false },
      meta: { interface: 'input', note: 'Telegram user ID of the admin' },
    },
    {
      field: 'admin_token',
      type: 'string',
      schema: { is_nullable: false, max_length: 100 },
      meta: { interface: 'input', note: 'Admin token for non-Telegram login (UUID)' },
    },
    {
      field: 'role',
      type: 'string',
      schema: { is_nullable: false, default_value: 'owner', max_length: 20 },
      meta: {
        interface: 'select-dropdown',
        options: {
          choices: [
            { text: 'Owner', value: 'owner' },
            { text: 'Manager', value: 'manager' },
          ],
        },
      },
    },
    {
      field: 'name',
      type: 'string',
      schema: { is_nullable: false, max_length: 255 },
      meta: { interface: 'input', note: 'Display name of the admin' },
    },
    {
      field: 'created_at',
      type: 'timestamp',
      schema: { default_value: 'now()' },
      meta: { interface: 'datetime', display: 'datetime' },
    },
  ];

  for (const field of fields) {
    try {
      await api.post(`/fields/${collectionId}`, {
        field: field.field,
        type: field.type,
        schema: field.schema || {},
        meta: field.meta || {},
      });
      console.log(`  Field: ${field.field} (${field.type})`);
    } catch (e: any) {
      console.error(`  Failed: ${field.field}: ${e.response?.data?.message || e.message}`);
    }
  }

  // Set public read permissions so the auth API can query tenant_admins
  // without needing the admin token for the initial auth flow
  // (Actually, we use admin token for all queries, so this is optional)

  console.log('\ntenant_admins schema created!');
  console.log('\nTo make the collection publicly readable (optional):');
  console.log('  Go to Directus Settings > Roles & Permissions > Public');
  console.log('  Enable Read on tenant_admins collection\n');
}

main().catch(console.error);
