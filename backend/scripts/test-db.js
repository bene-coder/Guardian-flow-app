require('dotenv').config();

// Debug: Check if .env is loaded
console.log('🔍 Debugging .env loading...\n');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ Found' : '❌ Missing');
console.log('SUPABASE_KEY:', process.env.SUPABASE_KEY ? '✅ Found' : '❌ Missing');

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
  console.error('\n❌ ERROR: .env variables not loaded!');
  console.error('Make sure .env file exists in:', __dirname);
  console.error('Current directory:', process.cwd());
  process.exit(1);
}

console.log('\n✅ Environment variables loaded successfully!\n');

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function testConnection() {
  console.log('🧪 Testing Supabase connection...\n');

  try {
    // Test 1: Fetch vehicles
    console.log('1️⃣ Fetching vehicles...');
    const { data: vehicles, error: vError } = await supabase
      .from('vehicles')
      .select('*');

    if (vError) {
      console.error('❌ Error fetching vehicles:', vError.message);
      return;
    }

    console.log(`✅ Found ${vehicles.length} vehicles`);
    vehicles.forEach(v => console.log(`   - ${v.name} (${v.id})`));

    // Test 2: Insert a test location
    console.log('\n2️⃣ Inserting test location...');
    const { data: location, error: lError } = await supabase
      .from('locations')
      .insert([{
        vehicle_id: 'vehicle-001',
        lat: 40.7580,
        lng: -73.9855,
        speed: 55,
        heading: 90
      }])
      .select();

    if (lError) {
      console.error('❌ Error inserting location:', lError.message);
      return;
    }

    console.log('✅ Location inserted:', location[0].id);

    // Test 3: Call custom function
    console.log('\n3️⃣ Testing custom function...');
    const { data: latest, error: fError } = await supabase
      .rpc('get_latest_locations');

    if (fError) {
      console.error('❌ Error calling function:', fError.message);
      return;
    }

    console.log(`✅ Latest locations retrieved: ${latest.length} vehicles`);

    console.log('\n✅ ALL TESTS PASSED! Database is ready.');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testConnection();