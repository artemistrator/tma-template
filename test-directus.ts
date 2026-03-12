import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config({ override: true });

const DIRECTUS_URL = process.env.DIRECTUS_URL || 'http://localhost:8055';
const ADMIN_EMAIL = process.env.DIRECTUS_ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.DIRECTUS_ADMIN_PASSWORD || 'admin';

async function test() {
  console.log('Testing Directus connection...');
  
  const response = await axios.post(`${DIRECTUS_URL}/auth/login`, {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });
  
  const token = response.data.data.access_token;
  console.log('✅ Token received:', token.substring(0, 50) + '...');
  
  const api = axios.create({
    baseURL: DIRECTUS_URL,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });
  
  console.log('Creating test collection...');
  const result = await api.post('/collections', {
    collection: 'test_from_ts',
    meta: { collection: 'test_from_ts', icon: 'star' },
    schema: { name: 'test_from_ts' },
  });
  
  console.log('✅ Collection created:', result.data.data.collection);
}

test().catch(console.error);
