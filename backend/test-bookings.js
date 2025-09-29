const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://jfmchgmllvyyzcmtknwd.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  db: {
    schema: 'public'
  }
});

async function testBookings() {
  console.log('Testing bookings table...');
  
  try {
    // Test simple query
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .limit(5);
    
    if (error) {
      console.error('Error:', error);
    } else {
      console.log('Bookings data:', data);
    }
  } catch (err) {
    console.error('Exception:', err);
  }
}

testBookings();
