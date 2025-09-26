require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

console.log('🔧 Supabase Config:');
console.log('URL:', supabaseUrl);
console.log('Key length:', supabaseKey?.length || 0);

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
  console.log('\n🔍 Checking table structure...');
  
  const tables = ['users', 'branches', 'slots', 'bookings', 'notifications', 'waiting_list'];
  
  for (const table of tables) {
    try {
      console.log(`\n📋 Checking ${table} table:`);
      
      // Try to get table info
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        console.log(`❌ Error: ${error.message}`);
        console.log(`   Code: ${error.code}`);
        console.log(`   Details: ${error.details}`);
        console.log(`   Hint: ${error.hint}`);
      } else {
        console.log(`✅ Success! Found ${data?.length || 0} records`);
        if (data && data.length > 0) {
          console.log(`   Sample record keys:`, Object.keys(data[0]));
        }
      }
    } catch (err) {
      console.log(`❌ Exception: ${err.message}`);
    }
  }
}

checkTables().catch(console.error);
