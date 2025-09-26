require('dotenv').config();
const { Client } = require('pg');

console.log('Testing direct PostgreSQL connection...');
console.log('DATABASE_URL:', process.env.DATABASE_URL);

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

client.connect()
  .then(() => {
    console.log('✅ Connected to PostgreSQL database');
    
    // Test query to check tables
    return client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
  })
  .then((result) => {
    console.log('📋 Available tables:');
    result.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    
    // Test query to check users table
    return client.query('SELECT COUNT(*) as count FROM users;');
  })
  .then((result) => {
    console.log(`👥 Users count: ${result.rows[0].count}`);
    
    // Test query to check branches table
    return client.query('SELECT COUNT(*) as count FROM branches;');
  })
  .then((result) => {
    console.log(`🏢 Branches count: ${result.rows[0].count}`);
    
    // Test query to check slots table
    return client.query('SELECT COUNT(*) as count FROM slots;');
  })
  .then((result) => {
    console.log(`📅 Slots count: ${result.rows[0].count}`);
    
    // Test query to check bookings table
    return client.query('SELECT COUNT(*) as count FROM bookings;');
  })
  .then((result) => {
    console.log(`📝 Bookings count: ${result.rows[0].count}`);
    
    // Test query to check notifications table
    return client.query('SELECT COUNT(*) as count FROM notifications;');
  })
  .then((result) => {
    console.log(`🔔 Notifications count: ${result.rows[0].count}`);
    
    console.log('\n🎉 Database connection successful! All tables are accessible.');
  })
  .catch((err) => {
    console.error('❌ Database connection failed:', err.message);
  })
  .finally(() => {
    client.end();
  });
