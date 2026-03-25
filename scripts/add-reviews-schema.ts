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
  console.log('Adding reviews schema to Directus...\n');
  const api = await createApi();

  const collectionId = 'reviews';

  // Check if already exists
  try {
    await api.get(`/collections/${collectionId}`);
    console.log('Collection reviews already exists. Skipping creation.');
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
        icon: 'rate_review',
        singleton: false,
        accountability: 'all',
      },
      schema: {
        name: collectionId,
        comment: 'User reviews with moderation for tenants',
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
      meta: { interface: 'input', note: 'Tenant slug', sort: 1 },
    },
    {
      field: 'author_name',
      type: 'string',
      schema: { is_nullable: false, max_length: 255 },
      meta: { interface: 'input', note: 'Display name of the review author', sort: 2 },
    },
    {
      field: 'telegram_user_id',
      type: 'bigInteger',
      schema: { is_nullable: true },
      meta: { interface: 'input', note: 'Telegram user ID (for deduplication)', sort: 3 },
    },
    {
      field: 'rating',
      type: 'integer',
      schema: { is_nullable: false },
      meta: { interface: 'input', note: 'Rating 1-5', sort: 4 },
    },
    {
      field: 'text',
      type: 'text',
      schema: { is_nullable: false },
      meta: { interface: 'input-multiline', note: 'Review text (max 1000 chars)', sort: 5 },
    },
    {
      field: 'target_type',
      type: 'string',
      schema: { is_nullable: true, default_value: 'business', max_length: 50 },
      meta: {
        interface: 'select-dropdown',
        options: {
          choices: [
            { text: 'Business', value: 'business' },
            { text: 'Product', value: 'product' },
            { text: 'Service', value: 'service' },
            { text: 'Info Product', value: 'info_product' },
          ],
        },
        note: 'What this review is about',
        sort: 6,
      },
    },
    {
      field: 'target_id',
      type: 'string',
      schema: { is_nullable: true, max_length: 100 },
      meta: { interface: 'input', note: 'ID of the product/service/info_product (null for business reviews)', sort: 7 },
    },
    {
      field: 'status',
      type: 'string',
      schema: { is_nullable: false, default_value: 'pending', max_length: 20 },
      meta: {
        interface: 'select-dropdown',
        options: {
          choices: [
            { text: 'Pending', value: 'pending' },
            { text: 'Approved', value: 'approved' },
            { text: 'Rejected', value: 'rejected' },
          ],
        },
        sort: 8,
      },
    },
    {
      field: 'moderation_note',
      type: 'text',
      schema: { is_nullable: true },
      meta: { interface: 'input-multiline', note: 'Internal note from moderator', sort: 9 },
    },
    {
      field: 'approved_at',
      type: 'timestamp',
      schema: { is_nullable: true },
      meta: { interface: 'datetime', display: 'datetime', sort: 10 },
    },
    {
      field: 'created_at',
      type: 'timestamp',
      schema: { default_value: 'now()' },
      meta: { interface: 'datetime', display: 'datetime', sort: 11 },
    },
    {
      field: 'updated_at',
      type: 'timestamp',
      schema: { is_nullable: true },
      meta: { interface: 'datetime', display: 'datetime', sort: 12 },
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

  // Set public read permissions for approved reviews
  try {
    await api.post('/permissions', {
      collection: collectionId,
      role: null, // public
      action: 'read',
      fields: ['id', 'tenant_id', 'author_name', 'rating', 'text', 'target_type', 'target_id', 'status', 'created_at', 'approved_at'],
      permissions: { status: { _eq: 'approved' } },
    });
    console.log('\n  Public read permission set (approved reviews only)');
  } catch (e: any) {
    console.error(`  Failed to set permissions: ${e.response?.data?.message || e.message}`);
  }

  // Set public create permission for submitting reviews
  try {
    await api.post('/permissions', {
      collection: collectionId,
      role: null, // public
      action: 'create',
      fields: ['tenant_id', 'author_name', 'telegram_user_id', 'rating', 'text', 'target_type', 'target_id'],
    });
    console.log('  Public create permission set (submit reviews)');
  } catch (e: any) {
    console.error(`  Failed to set create permissions: ${e.response?.data?.message || e.message}`);
  }

  console.log('\nreviews schema created successfully!');
}

main().catch(console.error);
