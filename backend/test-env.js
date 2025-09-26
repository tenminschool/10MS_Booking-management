require('dotenv').config();

console.log('Environment Variables:');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL);
console.log('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? 'SET' : 'NOT SET');
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'NOT SET');
console.log('DATABASE_URL:', process.env.DATABASE_URL);

// Test Supabase connection
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (supabaseUrl && supabaseKey) {
  console.log('\nTesting Supabase connection...');
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  supabase.from('users').select('id').limit(1)
    .then(({ data, error }) => {
      if (error) {
        console.log('❌ Supabase connection failed:', error.message);
      } else {
        console.log('✅ Supabase connection successful');
        console.log('Data:', data);
      }
    })
    .catch(err => {
      console.log('❌ Supabase connection error:', err.message);
    });
} else {
  console.log('❌ Missing Supabase credentials');
}
