const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Required: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY)');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupDatabase() {
  console.log('🚀 Starting Supabase database setup...');
  
  try {
    // Test connection first
    console.log('📡 Testing Supabase connection...');
    const { data: testData, error: testError } = await supabase
      .from('users')
      .select('id')
      .limit(1);
    
    if (testError) {
      console.log('⚠️  Database not yet set up, proceeding with setup...');
    } else {
      console.log('✅ Database connection successful');
    }

    // Read and execute the SQL setup script
    const fs = require('fs');
    const path = require('path');
    
    const sqlPath = path.join(__dirname, 'setup-database.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📄 Executing database setup script...');
    
    // Split the SQL into individual statements and execute them
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          const { error } = await supabase.rpc('exec_sql', { sql: statement });
          if (error) {
            console.log(`⚠️  Statement warning: ${error.message}`);
            // Don't count as error for some expected warnings
            if (!error.message.includes('already exists') && 
                !error.message.includes('does not exist') &&
                !error.message.includes('relation') &&
                !error.message.includes('type')) {
              errorCount++;
            }
          } else {
            successCount++;
          }
        } catch (err) {
          console.log(`⚠️  Statement error: ${err.message}`);
          errorCount++;
        }
      }
    }
    
    console.log(`\n📊 Setup Results:`);
    console.log(`✅ Successful statements: ${successCount}`);
    console.log(`⚠️  Warnings/Errors: ${errorCount}`);
    
    // Test the setup by querying some tables
    console.log('\n🧪 Testing database setup...');
    
    const tests = [
      { name: 'Branches', query: () => supabase.from('branches').select('count', { count: 'exact', head: true }) },
      { name: 'Users', query: () => supabase.from('users').select('count', { count: 'exact', head: true }) },
      { name: 'Slots', query: () => supabase.from('slots').select('count', { count: 'exact', head: true }) },
      { name: 'Notifications', query: () => supabase.from('notifications').select('count', { count: 'exact', head: true }) },
      { name: 'Waiting List', query: () => supabase.from('waiting_list').select('count', { count: 'exact', head: true }) }
    ];
    
    for (const test of tests) {
      try {
        const { data, error } = await test.query();
        if (error) {
          console.log(`❌ ${test.name}: ${error.message}`);
        } else {
          console.log(`✅ ${test.name}: ${data?.length || 0} records`);
        }
      } catch (err) {
        console.log(`❌ ${test.name}: ${err.message}`);
      }
    }
    
    console.log('\n🎉 Database setup completed!');
    console.log('🔗 You can now test the API endpoints');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    process.exit(1);
  }
}

// Run the setup
setupDatabase();
