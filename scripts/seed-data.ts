/**
 * Directus Database Seed Script
 * 
 * This script populates Directus with demo data for testing.
 * Run with: npm run seed:db
 * 
 * Creates:
 * - 2 tenants (Mario Pizza, Blade & Fade)
 * - Products for each tenant
 */

import axios from 'axios';
import dotenv from 'dotenv';
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

    // Create API instance with token AFTER authentication
    directusApi = axios.create({
      baseURL: DIRECTUS_URL,
    });
    
    // Set headers explicitly
    directusApi.defaults.headers.common['Content-Type'] = 'application/json';
    directusApi.defaults.headers.common['Authorization'] = `Bearer ${token}`;

    return token;
  } catch (error: any) {
    console.error('❌ Authentication failed:', error.response?.data?.message || error.message);
    process.exit(1);
  }
}

/**
 * Check if item exists in collection
 */
async function itemExists(collection: string, id: string): Promise<boolean> {
  try {
    await directusApi.get(`/items/${collection}/${id}`);
    return true;
  } catch (error: any) {
    if (error.response?.status === 404) {
      return false;
    }
    // Re-throw if it's not a 404 (item not found)
    throw error;
  }
}

/**
 * Create tenant in Directus
 */
async function createTenant(tenant: {
  id: string;
  name: string;
  slug: string;
  config: Record<string, any>;
}): Promise<void> {
  const exists = await itemExists('tenants', tenant.id);
  
  if (exists) {
    console.log(`⏭️  Tenant "${tenant.name}" already exists, skipping...`);
    return;
  }

  console.log(`🏢 Creating tenant "${tenant.name}" (${tenant.slug})...`);

  try {
    await directusApi.post('/items/tenants', {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      config: tenant.config,
      created_at: new Date().toISOString(),
    });

    console.log(`   ✅ Tenant "${tenant.name}" created`);
  } catch (error: any) {
    console.error(`❌ Failed to create tenant "${tenant.name}":`, error.response?.data?.message || error.message);
    throw error;
  }
}

/**
 * Create product in Directus
 */
async function createProduct(product: {
  id: string;
  name: string;
  price: number;
  description: string;
  category: string;
  status: string;
  tenant_id: string;
}): Promise<void> {
  const exists = await itemExists('products', product.id);
  
  if (exists) {
    console.log(`⏭️  Product "${product.name}" already exists, skipping...`);
    return;
  }

  console.log(`📦 Creating product "${product.name}" ($${product.price})...`);

  try {
    await directusApi.post('/items/products', {
      id: product.id,
      name: product.name,
      price: product.price,
      description: product.description,
      category: product.category,
      status: product.status,
      tenant_id: product.tenant_id,
      created_at: new Date().toISOString(),
    });

    console.log(`   ✅ Product "${product.name}" created for tenant "${product.tenant_id}"`);
  } catch (error: any) {
    console.error(`❌ Failed to create product "${product.name}":`, error.response?.data?.message || error.message);
    throw error;
  }
}

/**
 * Demo Data
 */

// Tenants
const tenants = [
  {
    id: 'tenant-pizza-001',
    name: 'Mario Pizza',
    slug: 'pizza',
    config: {
      theme: {
        primaryColor: '#FF6B6B',
        secondaryColor: '#4ECDC4',
      },
      businessType: 'ecommerce',
      currency: 'USD',
      locale: 'en',
    },
  },
  {
    id: 'tenant-barber-001',
    name: 'Blade & Fade Barbershop',
    slug: 'barber',
    config: {
      theme: {
        primaryColor: '#1a1a2e',
        secondaryColor: '#16213e',
      },
      businessType: 'booking',
      currency: 'USD',
      locale: 'en',
    },
  },
];

// Products for Mario Pizza (tenant_id: 'pizza')
const pizzaProducts = [
  {
    id: 'product-pizza-margherita',
    name: 'Margherita Pizza',
    price: 12.99,
    description: 'Classic Italian pizza with tomato sauce, fresh mozzarella, and basil',
    category: 'Pizza',
    status: 'published',
    tenant_id: 'pizza',
  },
  {
    id: 'product-pizza-pepperoni',
    name: 'Pepperoni Pizza',
    price: 14.99,
    description: 'Loaded with pepperoni and mozzarella cheese on tomato sauce base',
    category: 'Pizza',
    status: 'published',
    tenant_id: 'pizza',
  },
  {
    id: 'product-pizza-quattro',
    name: 'Quattro Formaggi',
    price: 16.99,
    description: 'Four cheese pizza: mozzarella, gorgonzola, parmesan, and fontina',
    category: 'Pizza',
    status: 'published',
    tenant_id: 'pizza',
  },
  {
    id: 'product-pizza-vegetariana',
    name: 'Vegetariana Pizza',
    price: 13.99,
    description: 'Fresh vegetables: bell peppers, mushrooms, onions, olives, and tomatoes',
    category: 'Pizza',
    status: 'published',
    tenant_id: 'pizza',
  },
  {
    id: 'product-salad-caesar',
    name: 'Caesar Salad',
    price: 9.99,
    description: 'Crisp romaine lettuce with parmesan, croutons, and Caesar dressing',
    category: 'Salads',
    status: 'published',
    tenant_id: 'pizza',
  },
  {
    id: 'product-pasta-carbonara',
    name: 'Pasta Carbonara',
    price: 13.99,
    description: 'Spaghetti with egg, pecorino cheese, guanciale, and black pepper',
    category: 'Pasta',
    status: 'published',
    tenant_id: 'pizza',
  },
];

// Products for Blade & Fade (tenant_id: 'barber')
const barberProducts = [
  {
    id: 'product-barber-classic',
    name: 'Classic Haircut',
    price: 35.00,
    description: 'Precision haircut with wash and professional styling',
    category: 'Haircut',
    status: 'published',
    tenant_id: 'barber',
  },
  {
    id: 'product-barber-beard',
    name: 'Beard Trim & Style',
    price: 20.00,
    description: 'Professional beard shaping, trim, and oil treatment',
    category: 'Beard',
    status: 'published',
    tenant_id: 'barber',
  },
  {
    id: 'product-barber-full',
    name: 'Full Service',
    price: 50.00,
    description: 'Complete package: haircut + beard trim + hot towel treatment',
    category: 'Combo',
    status: 'published',
    tenant_id: 'barber',
  },
  {
    id: 'product-barber-kids',
    name: 'Kids Haircut',
    price: 25.00,
    description: 'Haircut for children under 12 years old',
    category: 'Haircut',
    status: 'published',
    tenant_id: 'barber',
  },
  {
    id: 'product-barber-shave',
    name: 'Hot Towel Shave',
    price: 30.00,
    description: 'Traditional straight razor shave with hot towel treatment',
    category: 'Shave',
    status: 'published',
    tenant_id: 'barber',
  },
];

/**
 * Main function
 */
async function main() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║       Directus Database Seed Script                       ║');
  console.log('║       Populating with Demo Data                           ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');

  // Step 1: Authenticate
  await authenticate();

  // Step 2: Create tenants
  console.log('\n🏢 Creating tenants...\n');
  
  for (const tenant of tenants) {
    await createTenant(tenant);
  }

  // Step 3: Create products for Mario Pizza
  console.log('\n🍕 Creating products for Mario Pizza...\n');
  
  for (const product of pizzaProducts) {
    await createProduct(product);
  }

  // Step 4: Create products for Blade & Fade
  console.log('\n✂️  Creating products for Blade & Fade...\n');
  
  for (const product of barberProducts) {
    await createProduct(product);
  }

  // Summary
  console.log('\n✅ Database seeding complete!');
  console.log('\n📊 Summary:');
  console.log('   Tenants created:', tenants.length);
  console.log('   Pizza products:', pizzaProducts.length);
  console.log('   Barber products:', barberProducts.length);
  console.log('   Total products:', pizzaProducts.length + barberProducts.length);
  console.log('\n🌐 View data in Directus admin:', DIRECTUS_URL);
  console.log('   - Content → Tenants');
  console.log('   - Content → Products (filter by tenant_id)');
}

// Run the script
main().catch((error) => {
  console.error('\n❌ Script failed:', error.message);
  process.exit(1);
});
