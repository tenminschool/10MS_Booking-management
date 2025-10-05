const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createDemoRooms() {
  console.log('🏗️  Creating demo rooms for all branches...\n');

  try {
    // Get all branches
    const { data: branches, error: branchesError } = await supabase
      .from('branches')
      .select('id, name')
      .eq('isActive', true);

    if (branchesError) {
      throw new Error(`Failed to fetch branches: ${branchesError.message}`);
    }

    if (!branches || branches.length === 0) {
      console.log('❌ No active branches found. Please create branches first.');
      return;
    }

    console.log(`📋 Found ${branches.length} active branches`);

    // Define room types and equipment for demo rooms
    const roomTypes = [
      { type: 'general', equipment: ['Whiteboard', 'Projector', 'Chairs'] },
      { type: 'computer_lab', equipment: ['Computer', 'Monitor', 'Keyboard', 'Mouse', 'Headphones'] },
      { type: 'counselling', equipment: ['Comfortable Chairs', 'Whiteboard', 'Notebook'] },
      { type: 'exam_hall', equipment: ['Desks', 'Chairs', 'Clock'] },
      { type: 'general', equipment: ['Whiteboard', 'Tables', 'Chairs'] }
    ];

    let totalRoomsCreated = 0;

    for (const branch of branches) {
      console.log(`\n🏢 Creating rooms for branch: ${branch.name}`);

      // Check if rooms already exist for this branch
      const { data: existingRooms, error: existingError } = await supabase
        .from('rooms')
        .select('id')
        .eq('branch_id', branch.id);

      if (existingError) {
        console.error(`❌ Error checking existing rooms for ${branch.name}:`, existingError.message);
        continue;
      }

      if (existingRooms && existingRooms.length > 0) {
        console.log(`✅ Branch ${branch.name} already has ${existingRooms.length} rooms`);
        continue;
      }

      // Create 5 demo rooms for this branch
      const demoRooms = [];
      for (let i = 1; i <= 5; i++) {
        const roomType = roomTypes[i - 1];
        demoRooms.push({
          branch_id: branch.id,
          room_number: `${i.toString().padStart(2, '0')}${i}`, // 101, 102, 103, 104, 105
          room_name: `Room ${i.toString().padStart(2, '0')}${i}`,
          room_type: roomType.type,
          capacity: roomType.type === 'computer_lab' ? 20 : roomType.type === 'exam_hall' ? 50 : 10,
          equipment: roomType.equipment,
          is_active: true
        });
      }

      // Insert rooms for this branch
      const { data: createdRooms, error: insertError } = await supabase
        .from('rooms')
        .insert(demoRooms)
        .select();

      if (insertError) {
        console.error(`❌ Error creating rooms for ${branch.name}:`, insertError.message);
      } else {
        console.log(`✅ Created ${createdRooms.length} rooms for ${branch.name}:`);
        createdRooms.forEach(room => {
          console.log(`   - ${room.room_number}: ${room.room_name} (${room.room_type}, capacity: ${room.capacity})`);
        });
        totalRoomsCreated += createdRooms.length;
      }
    }

    console.log(`\n🎉 Demo room creation completed!`);
    console.log(`📊 Summary:`);
    console.log(`   - Branches processed: ${branches.length}`);
    console.log(`   - Total rooms created: ${totalRoomsCreated}`);
    console.log(`   - Room naming pattern: 101, 102, 103, 104, 105`);
    console.log(`   - Room types: General, Computer Lab, Counselling, Exam Hall`);

  } catch (error) {
    console.error('❌ Error creating demo rooms:', error);
  }
}

createDemoRooms();
