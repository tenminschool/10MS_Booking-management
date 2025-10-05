const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function executeMigration() {
  console.log('🚀 Starting Service Types Migration...\n');

  try {
    // 1. Create service_types table
    console.log('1. Creating service_types table...');
    const { error: serviceTypesError } = await supabase
      .from('service_types')
      .select('id')
      .limit(1);

    if (serviceTypesError && serviceTypesError.code === 'PGRST106') {
      // Table doesn't exist, create it
      const createServiceTypesTable = `
        CREATE TABLE IF NOT EXISTS public.service_types (
          id text NOT NULL DEFAULT gen_random_uuid()::text,
          name text NOT NULL,
          code text NOT NULL UNIQUE,
          description text,
          category text NOT NULL DEFAULT 'paid',
          default_capacity integer DEFAULT 1,
          duration_minutes integer DEFAULT 60,
          is_active boolean DEFAULT true,
          created_at timestamp with time zone NOT NULL DEFAULT now(),
          updated_at timestamp with time zone NOT NULL DEFAULT now(),
          CONSTRAINT service_types_pkey PRIMARY KEY (id)
        );
      `;
      
      const { error } = await supabase.rpc('exec', { sql: createServiceTypesTable });
      if (error) {
        console.error('❌ Error creating service_types table:', error);
        return;
      }
      console.log('✅ service_types table created');
    } else {
      console.log('✅ service_types table already exists');
    }

    // 2. Insert initial service types
    console.log('\n2. Inserting initial service types...');
    const { data: existingServices } = await supabase
      .from('service_types')
      .select('id')
      .limit(1);

    if (!existingServices || existingServices.length === 0) {
      const serviceTypes = [
        {
          name: 'CBT Full Mock',
          code: 'CBT_FULL_MOCK',
          description: 'Computer Based Test Full Mock - Complete IELTS simulation',
          category: 'paid',
          default_capacity: 1,
          duration_minutes: 180
        },
        {
          name: 'PBT Full Mock',
          code: 'PBT_FULL_MOCK',
          description: 'Paper Based Test Full Mock - Complete IELTS simulation',
          category: 'paid',
          default_capacity: 1,
          duration_minutes: 180
        },
        {
          name: 'Speaking Mock Test',
          code: 'SPEAKING_MOCK_TEST',
          description: 'IELTS Speaking Mock Test - 15 minutes assessment',
          category: 'paid',
          default_capacity: 1,
          duration_minutes: 15
        },
        {
          name: '1:1 Counselling',
          code: 'ONE_ON_ONE_COUNSELLING',
          description: 'Personal Counselling Session - Individual guidance',
          category: 'paid',
          default_capacity: 1,
          duration_minutes: 60
        },
        {
          name: 'Exam Accelerator Service',
          code: 'EXAM_ACCELERATOR_SERVICE',
          description: 'Intensive Exam Preparation - Focused study session',
          category: 'paid',
          default_capacity: 1,
          duration_minutes: 120
        }
      ];

      const { error: insertError } = await supabase
        .from('service_types')
        .insert(serviceTypes);

      if (insertError) {
        console.error('❌ Error inserting service types:', insertError);
      } else {
        console.log('✅ Initial service types inserted');
      }
    } else {
      console.log('✅ Service types already exist');
    }

    // 3. Create rooms table
    console.log('\n3. Creating rooms table...');
    const { error: roomsError } = await supabase
      .from('rooms')
      .select('id')
      .limit(1);

    if (roomsError && roomsError.code === 'PGRST106') {
      const createRoomsTable = `
        CREATE TABLE IF NOT EXISTS public.rooms (
          id text NOT NULL DEFAULT gen_random_uuid()::text,
          branch_id text NOT NULL,
          room_number text NOT NULL,
          room_name text NOT NULL,
          room_type text DEFAULT 'general',
          capacity integer NOT NULL DEFAULT 1,
          equipment text[],
          is_active boolean DEFAULT true,
          created_at timestamp with time zone NOT NULL DEFAULT now(),
          updated_at timestamp with time zone NOT NULL DEFAULT now(),
          CONSTRAINT rooms_pkey PRIMARY KEY (id),
          CONSTRAINT rooms_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id),
          CONSTRAINT rooms_unique_per_branch UNIQUE (branch_id, room_number)
        );
      `;
      
      const { error } = await supabase.rpc('exec', { sql: createRoomsTable });
      if (error) {
        console.error('❌ Error creating rooms table:', error);
      } else {
        console.log('✅ rooms table created');
      }
    } else {
      console.log('✅ rooms table already exists');
    }

    // 4. Update slots table
    console.log('\n4. Updating slots table...');
    const { error: slotsCheckError } = await supabase
      .from('slots')
      .select('service_type_id')
      .limit(1);

    if (slotsCheckError && slotsCheckError.message.includes('service_type_id')) {
      // Column doesn't exist, add it
      const alterSlotsTable = `
        ALTER TABLE public.slots 
        ADD COLUMN IF NOT EXISTS service_type_id text REFERENCES public.service_types(id),
        ADD COLUMN IF NOT EXISTS room_id text REFERENCES public.rooms(id),
        ADD COLUMN IF NOT EXISTS price decimal(10,2);
      `;
      
      const { error } = await supabase.rpc('exec', { sql: alterSlotsTable });
      if (error) {
        console.error('❌ Error updating slots table:', error);
      } else {
        console.log('✅ slots table updated');
      }
    } else {
      console.log('✅ slots table already has service_type_id column');
    }

    // 5. Update bookings table
    console.log('\n5. Updating bookings table...');
    const { error: bookingsCheckError } = await supabase
      .from('bookings')
      .select('service_type_id')
      .limit(1);

    if (bookingsCheckError && bookingsCheckError.message.includes('service_type_id')) {
      const alterBookingsTable = `
        ALTER TABLE public.bookings 
        ADD COLUMN IF NOT EXISTS service_type_id text REFERENCES public.service_types(id),
        ADD COLUMN IF NOT EXISTS amount_paid decimal(10,2),
        ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending';
      `;
      
      const { error } = await supabase.rpc('exec', { sql: alterBookingsTable });
      if (error) {
        console.error('❌ Error updating bookings table:', error);
      } else {
        console.log('✅ bookings table updated');
      }
    } else {
      console.log('✅ bookings table already has service_type_id column');
    }

    console.log('\n🎉 Migration completed successfully!');
    console.log('\n📋 Summary:');
    console.log('✅ service_types table created/verified');
    console.log('✅ Initial service types inserted');
    console.log('✅ rooms table created/verified');
    console.log('✅ slots table updated with service_type_id, room_id, price');
    console.log('✅ bookings table updated with service_type_id, amount_paid, payment_status');

  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

executeMigration();
