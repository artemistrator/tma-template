/**
 * Directus Database Setup Script
 * 
 * This script automates the creation of collections and fields in Directus.
 * Run with: npm run setup:db
 * 
 * Requirements:
 * - Directus running at DIRECTUS_URL (default: http://localhost:8055)
 * - Admin credentials in .env.local
 */

import axios from 'axios';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load environment variables
const envPath = join(__dirname, '..', '.env.local');
console.log('Loading environment from:', envPath);

try {
  dotenv.config({ path: envPath, override: true });
} catch (error) {
  console.warn('Could not load .env.local, using environment variables');
}

// Configuration from environment
const DIRECTUS_URL = process.env.DIRECTUS_URL || 'http://localhost:8055';
const ADMIN_EMAIL = process.env.DIRECTUS_ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.DIRECTUS_ADMIN_PASSWORD || 'admin';

console.log('Directus URL:', DIRECTUS_URL);
console.log('Admin Email:', ADMIN_EMAIL);

// Axios instance for Directus API (will be set after authentication)
let directusApi: ReturnType<typeof axios.create>;

/**
 * Authenticate with Directus and get access token
 */
async function authenticate(): Promise<string> {
  console.log('\n🔐 Authenticating with Directus...');
  
  try {
    const response = await axios.post(`${DIRECTUS_URL}/auth/login`, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    });

    const token = response.data.data.access_token;
    console.log('✅ Authentication successful!');
    console.log('   Token expires in:', response.data.data.expires / 60, 'minutes');
    
    // Create API instance with token AFTER authentication
    directusApi = axios.create({
      baseURL: DIRECTUS_URL,
    });
    
    // Set headers explicitly
    directusApi.defaults.headers.common['Content-Type'] = 'application/json';
    directusApi.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    
    console.log('   API instance created with token');
    console.log('   API headers:', directusApi.defaults.headers.common);
    
    return token;
  } catch (error: any) {
    console.error('❌ Authentication failed:', error.response?.data?.message || error.message);
    console.error('   Please check your DIRECTUS_ADMIN_EMAIL and DIRECTUS_ADMIN_PASSWORD');
    process.exit(1);
  }
}

/**
 * Check if collection exists
 */
async function collectionExists(collectionId: string): Promise<boolean> {
  try {
    const response = await directusApi.get(`/collections/${collectionId}`);
    console.log(`   ✓ Collection "${collectionId}" exists`);
    return true;
  } catch (error: any) {
    // Directus returns 403 instead of 404 for non-existent collections (security feature)
    if (error.response?.status === 404 || error.response?.status === 403) {
      return false;
    }
    console.warn(`   Warning: Could not check collection "${collectionId}":`, error.response?.status);
    throw error;
  }
}

/**
 * Create collection in Directus
 */
async function createCollection(collection: {
  collection: string;
  meta?: {
    collection?: string;
    icon?: string;
    color?: string;
    display_template?: string;
  };
  schema?: {
    name: string;
    type: string;
    schema?: string;
    comment?: string;
  };
  fields: Array<{
    field: string;
    type: string;
    schema?: {
      is_primary_key?: boolean;
      is_nullable?: boolean;
      default_value?: any;
      max_length?: number;
      numeric_precision?: number;
      numeric_scale?: number;
    };
    meta?: {
      interface?: string;
      display?: string;
      options?: any;
      display_options?: any;
      width?: 'full' | 'half' | 'fill';
      group?: string;
    };
  }>;
}): Promise<void> {
  const { collection: collectionId, meta, schema, fields } = collection;
  
  // Check if collection exists
  const exists = await collectionExists(collectionId);
  
  if (exists) {
    console.log(`⏭️  Collection "${collectionId}" already exists, skipping...`);
    return;
  }

  console.log(`\n📁 Creating collection "${collectionId}"...`);

  try {
    // Create collection
    await directusApi.post('/collections', {
      collection: collectionId,
      meta: meta || {},
      schema: schema || { name: collectionId },
    });

    console.log(`   ✅ Collection "${collectionId}" created`);

    // Create fields
    for (const field of fields) {
      try {
        await directusApi.post('/fields', {
          collection: collectionId,
          field: field.field,
          type: field.type,
          schema: field.schema,
          meta: field.meta,
        });
        console.log(`   ✅ Field "${field.field}" added`);
      } catch (error: any) {
        console.warn(`   ⚠️  Field "${field.field}" may already exist:`, error.response?.data?.message);
      }
    }

  } catch (error: any) {
    console.error(`❌ Failed to create collection "${collectionId}":`, error.response?.data?.message || error.message);
    console.error('Full error:', JSON.stringify(error.response?.data, null, 2));
    console.error('Status:', error.response?.status);
    console.error('Headers:', error.response?.headers);
    throw error;
  }
}

/**
 * Define collections to create
 */
const collections = [
  {
    collection: 'tenants',
    meta: {
      collection: 'tenants',
      icon: 'storefront',
      color: '#18222F',
      display_template: '{{name}} ({{slug}})',
    },
    schema: {
      name: 'tenants',
      type: 'table',
    },
    fields: [
      {
        field: 'id',
        type: 'uuid',
        schema: {
          is_primary_key: true,
          is_nullable: false,
        },
        meta: {
          interface: 'input',
          display: 'formatted-value',
          width: 'full',
        },
      },
      {
        field: 'name',
        type: 'string',
        schema: {
          is_nullable: false,
          max_length: 255,
        },
        meta: {
          interface: 'input',
          display: 'formatted-value',
          width: 'full',
        },
      },
      {
        field: 'slug',
        type: 'string',
        schema: {
          is_nullable: false,
          is_unique: true,
          max_length: 100,
        },
        meta: {
          interface: 'input',
          display: 'formatted-value',
          width: 'half',
        },
      },
      {
        field: 'config',
        type: 'json',
        schema: {
          is_nullable: true,
        },
        meta: {
          interface: 'input-code',
          display: 'formatted-json-value',
          options: {
            language: 'json',
          },
          width: 'full',
        },
      },
      {
        field: 'created_at',
        type: 'timestamp',
        schema: {
          is_nullable: true,
          default_value: 'now()',
        },
        meta: {
          interface: 'datetime',
          display: 'datetime',
          width: 'half',
        },
      },
    ],
  },
  {
    collection: 'products',
    meta: {
      collection: 'products',
      icon: 'inventory_2',
      color: '#2EC4B6',
      display_template: '{{name}} - ${{price}}',
    },
    schema: {
      name: 'products',
      type: 'table',
    },
    fields: [
      {
        field: 'id',
        type: 'uuid',
        schema: {
          is_primary_key: true,
          is_nullable: false,
        },
        meta: {
          interface: 'input',
          display: 'formatted-value',
          width: 'full',
        },
      },
      {
        field: 'name',
        type: 'string',
        schema: {
          is_nullable: false,
          max_length: 255,
        },
        meta: {
          interface: 'input',
          display: 'formatted-value',
          width: 'full',
        },
      },
      {
        field: 'price',
        type: 'decimal',
        schema: {
          is_nullable: false,
          numeric_precision: 10,
          numeric_scale: 2,
        },
        meta: {
          interface: 'input',
          display: 'formatted-value',
          options: {
            prefix: '$',
          },
          width: 'half',
        },
      },
      {
        field: 'description',
        type: 'text',
        schema: {
          is_nullable: true,
        },
        meta: {
          interface: 'input-multiline',
          display: 'formatted-value',
          options: {
            softLength: 500,
          },
          width: 'full',
        },
      },
      {
        field: 'image',
        type: 'uuid',
        schema: {
          is_nullable: true,
        },
        meta: {
          interface: 'file-image',
          display: 'file',
          width: 'half',
        },
      },
      {
        field: 'category',
        type: 'string',
        schema: {
          is_nullable: true,
          max_length: 100,
        },
        meta: {
          interface: 'input',
          display: 'formatted-value',
          width: 'half',
        },
      },
      {
        field: 'status',
        type: 'string',
        schema: {
          is_nullable: false,
          default_value: 'draft',
          max_length: 50,
        },
        meta: {
          interface: 'select-dropdown',
          display: 'formatted-value',
          options: {
            choices: [
              { text: 'Draft', value: 'draft' },
              { text: 'Published', value: 'published' },
              { text: 'Archived', value: 'archived' },
            ],
          },
          width: 'half',
        },
      },
      {
        field: 'tenant_id',
        type: 'string',
        schema: {
          is_nullable: false,
          max_length: 100,
        },
        meta: {
          interface: 'input',
          display: 'formatted-value',
          width: 'half',
          note: 'Tenant identifier for multi-tenancy',
        },
      },
      {
        field: 'created_at',
        type: 'timestamp',
        schema: {
          is_nullable: true,
          default_value: 'now()',
        },
        meta: {
          interface: 'datetime',
          display: 'datetime',
          width: 'half',
        },
      },
    ],
  },
  {
    collection: 'orders',
    meta: {
      collection: 'orders',
      icon: 'shopping_cart',
      color: '#FF6B6B',
      display_template: 'Order #{{id}} - {{customer_name}}',
    },
    schema: {
      name: 'orders',
      type: 'table',
    },
    fields: [
      {
        field: 'id',
        type: 'uuid',
        schema: {
          is_primary_key: true,
          is_nullable: false,
        },
        meta: {
          interface: 'input',
          display: 'formatted-value',
          width: 'full',
        },
      },
      {
        field: 'customer_name',
        type: 'string',
        schema: {
          is_nullable: false,
          max_length: 255,
        },
        meta: {
          interface: 'input',
          display: 'formatted-value',
          width: 'full',
        },
      },
      {
        field: 'customer_phone',
        type: 'string',
        schema: {
          is_nullable: true,
          max_length: 50,
        },
        meta: {
          interface: 'input',
          display: 'formatted-value',
          width: 'half',
        },
      },
      {
        field: 'customer_email',
        type: 'string',
        schema: {
          is_nullable: true,
          max_length: 255,
        },
        meta: {
          interface: 'input',
          display: 'formatted-value',
          width: 'half',
        },
      },
      {
        field: 'total',
        type: 'decimal',
        schema: {
          is_nullable: false,
          numeric_precision: 10,
          numeric_scale: 2,
        },
        meta: {
          interface: 'input',
          display: 'formatted-value',
          options: {
            prefix: '$',
          },
          width: 'half',
        },
      },
      {
        field: 'status',
        type: 'string',
        schema: {
          is_nullable: false,
          default_value: 'pending',
          max_length: 50,
        },
        meta: {
          interface: 'select-dropdown',
          display: 'formatted-value',
          options: {
            choices: [
              { text: 'Pending', value: 'pending' },
              { text: 'Confirmed', value: 'confirmed' },
              { text: 'Processing', value: 'processing' },
              { text: 'Shipped', value: 'shipped' },
              { text: 'Delivered', value: 'delivered' },
              { text: 'Cancelled', value: 'cancelled' },
            ],
          },
          width: 'half',
        },
      },
      {
        field: 'items',
        type: 'json',
        schema: {
          is_nullable: true,
        },
        meta: {
          interface: 'input-code',
          display: 'formatted-json-value',
          options: {
            language: 'json',
          },
          width: 'full',
        },
      },
      {
        field: 'shipping_address',
        type: 'json',
        schema: {
          is_nullable: true,
        },
        meta: {
          interface: 'input-code',
          display: 'formatted-json-value',
          width: 'full',
        },
      },
      {
        field: 'tenant_id',
        type: 'string',
        schema: {
          is_nullable: false,
          max_length: 100,
        },
        meta: {
          interface: 'input',
          display: 'formatted-value',
          width: 'half',
          note: 'Tenant identifier for multi-tenancy',
        },
      },
      {
        field: 'created_at',
        type: 'timestamp',
        schema: {
          is_nullable: true,
          default_value: 'now()',
        },
        meta: {
          interface: 'datetime',
          display: 'datetime',
          width: 'half',
        },
      },
    ],
  },
];

/**
 * Main function
 */
async function main() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║       Directus Database Setup Script                      ║');
  console.log('║       Creating Collections and Fields                     ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');

  // Step 1: Authenticate
  await authenticate();

  // Step 2: Create collections
  console.log('\n📋 Creating collections...\n');
  
  for (const collection of collections) {
    await createCollection(collection);
  }

  console.log('\n✅ Database setup complete!');
  console.log('\n📊 Summary:');
  console.log('   - tenants: Multi-tenant configuration storage');
  console.log('   - products: Product catalog with tenant isolation');
  console.log('   - orders: Order management with tenant isolation');
  console.log('\n🌐 Open Directus admin at:', DIRECTUS_URL);
  console.log('   Login:', ADMIN_EMAIL);
}

// Run the script
main().catch((error) => {
  console.error('\n❌ Script failed:', error.message);
  process.exit(1);
});
