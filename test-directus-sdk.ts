import { createDirectus, authentication, rest, createFields } from '@directus/sdk';

const DIRECTUS_URL = 'http://localhost:8055';
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'admin';

async function test() {
  console.log('Creating Directus client...');
  const client = createDirectus(DIRECTUS_URL)
    .with(authentication())
    .with(rest());

  console.log('Logging in...');
  await client.login(ADMIN_EMAIL, ADMIN_PASSWORD);
  
  console.log('Creating field...');
  try {
    const result = await client.request(createFields('tenants', {
      field: 'test_sdk',
      type: 'string',
      meta: {
        interface: 'input',
      },
      schema: {},
    }));
    console.log('✅ Field created:', result);
  } catch (e: any) {
    console.error('❌ Error:', e.message);
  }
}

test().catch(console.error);
