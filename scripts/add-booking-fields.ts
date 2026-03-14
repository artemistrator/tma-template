import axios from 'axios';
import dotenv from 'dotenv';
import { join } from 'path';

dotenv.config({ path: join(__dirname, '..', '.env.local'), override: true });

const DIRECTUS_URL = process.env.DIRECTUS_URL || 'http://localhost:8055';
const ADMIN_EMAIL = process.env.DIRECTUS_ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.DIRECTUS_ADMIN_PASSWORD || 'admin';

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║       Adding Booking Fields to Directus                   ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  // Login
  console.log('🔐 Logging in...');
  const auth = await axios.post(`${DIRECTUS_URL}/auth/login`, {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });
  const token = auth.data.data.access_token;
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  console.log('✅ Logged in\n');

  // Check if fields already exist
  console.log('📋 Checking existing fields...');
  const fieldsRes = await axios.get(`${DIRECTUS_URL}/fields/bookings`, { headers });
  const existingFields = fieldsRes.data.data.map((f: any) => f.field);
  console.log(`   Found ${existingFields.length} fields\n`);

  // Add start_time field
  if (!existingFields.includes('start_time')) {
    console.log('📝 Adding start_time field...');
    try {
      await axios.post(
        `${DIRECTUS_URL}/fields/bookings`,
        {
          field: 'start_time',
          type: 'time',
          schema: { is_nullable: true },
          meta: {
            interface: 'datetime',
            display: 'datetime',
            options: { time: true, timeSecond: false },
            display_options: { time: true, timeSecond: false },
          },
        },
        { headers }
      );
      console.log('   ✅ start_time added\n');
    } catch (e: any) {
      console.log(`   ⚠️  start_time: ${e.response?.data?.errors?.[0]?.message || 'exists'}\n`);
    }
  } else {
    console.log('   ⏭️  start_time already exists\n');
  }

  // Add end_time field
  if (!existingFields.includes('end_time')) {
    console.log('📝 Adding end_time field...');
    try {
      await axios.post(
        `${DIRECTUS_URL}/fields/bookings`,
        {
          field: 'end_time',
          type: 'time',
          schema: { is_nullable: true },
          meta: {
            interface: 'datetime',
            display: 'datetime',
            options: { time: true, timeSecond: false },
            display_options: { time: true, timeSecond: false },
          },
        },
        { headers }
      );
      console.log('   ✅ end_time added\n');
    } catch (e: any) {
      console.log(`   ⚠️  end_time: ${e.response?.data?.errors?.[0]?.message || 'exists'}\n`);
    }
  } else {
    console.log('   ⏭️  end_time already exists\n');
  }

  // Add service_duration field
  if (!existingFields.includes('service_duration')) {
    console.log('📝 Adding service_duration field...');
    try {
      await axios.post(
        `${DIRECTUS_URL}/fields/bookings`,
        {
          field: 'service_duration',
          type: 'integer',
          schema: { is_nullable: true, default_value: 30 },
          meta: {
            interface: 'input-number',
            display: 'formatted-value',
            options: { min: 5, max: 480, step: 5 },
          },
        },
        { headers }
      );
      console.log('   ✅ service_duration added\n');
    } catch (e: any) {
      console.log(`   ⚠️  service_duration: ${e.response?.data?.errors?.[0]?.message || 'exists'}\n`);
    }
  } else {
    console.log('   ⏭️  service_duration already exists\n');
  }

  console.log('✅ Booking fields setup complete!\n');
  console.log('📊 Summary:');
  console.log('   - start_time: Extracted start time for queries');
  console.log('   - end_time: Calculated end time');
  console.log('   - service_duration: Cached service duration');
  console.log('\n🎯 Next: Create availability API endpoint\n');
}

main().catch((e) => {
  console.error('❌ Error:', e.response?.data || e.message);
  process.exit(1);
});
