import axios from 'axios';
import dotenv from 'dotenv';
import { join } from 'path';

dotenv.config({ path: join(__dirname, '..', '.env.local'), override: true });

const DIRECTUS_URL = process.env.DIRECTUS_URL || 'http://localhost:8055';
const ADMIN_EMAIL = process.env.DIRECTUS_ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.DIRECTUS_ADMIN_PASSWORD || 'admin';

console.log('DIRECTUS_URL:', DIRECTUS_URL);
console.log('ADMIN_EMAIL:', ADMIN_EMAIL);

async function test() {
  // Login
  const authResponse = await axios.post(`${DIRECTUS_URL}/auth/login`, {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });
  
  const token = authResponse.data.data.access_token;
  console.log('✅ Token received');
  
  // Create API instance with token
  const api = axios.create({
    baseURL: DIRECTUS_URL,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });
  
  // Test 1: Get collections
  console.log('\nTest 1: GET /collections');
  const getResponse = await api.get('/collections');
  console.log('✅ GET works, collections count:', getResponse.data.data.length);
  
  // Test 2: Create collection
  console.log('\nTest 2: POST /collections');
  console.log('Request headers:', api.defaults.headers.common);
  
  try {
    const postResponse = await api.post('/collections', {
      collection: 'debug_test',
      meta: { collection: 'debug_test', icon: 'bug' },
      schema: { name: 'debug_test' },
    });
    console.log('✅ POST works, collection created:', postResponse.data.data.collection);
  } catch (error: any) {
    console.error('❌ POST failed:', error.response?.status);
    console.error('Response:', error.response?.data);
  }
}

test().catch(console.error);
