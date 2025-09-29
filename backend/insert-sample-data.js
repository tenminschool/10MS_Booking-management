const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials. Please check your .env file.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function insertSampleData() {
  try {
    console.log('Starting to insert sample data...')

    // Insert branches - using correct database column names
    const branches = [
      { id: 'branch-mirpur', name: 'Mirpur Branch', address: 'House 12, Road 7, Mirpur 1, Dhaka 1216', contact_number: '+880-2-9001234' },
      { id: 'branch-uttara', name: 'Uttara Branch', address: 'House 15, Sector 7, Uttara, Dhaka 1230', contact_number: '+880-2-9001235' },
      { id: 'branch-mogbazar', name: 'Mogbazar Branch', address: 'House 8, Mogbazar, Dhaka 1217', contact_number: '+880-2-9001236' },
      { id: 'branch-panthapath', name: 'Panthapath Branch', address: 'House 25, Panthapath, Dhaka 1205', contact_number: '+880-2-9001237' },
      { id: 'branch-chittagong', name: 'Chittagong Branch', address: 'House 30, Agrabad, Chittagong 4100', contact_number: '+880-2-9001238' }
    ]

    console.log('Inserting branches...')
    const { error: branchError } = await supabase
      .from('branches')
      .upsert(branches, { onConflict: 'id' })

    if (branchError) {
      console.error('Error inserting branches:', branchError)
      return
    }
    console.log('Branches inserted successfully!')

    // Insert teachers - using correct database column names
    const teachers = [
      { id: 'teacher-mirpur-1', name: 'Sarah Ahmed', email: 'sarah@10ms.com', role: 'TEACHER', branch_id: 'branch-mirpur', hashed_password: '$2b$10$dummy.hash.for.testing' },
      { id: 'teacher-mirpur-2', name: 'Rahim Khan', email: 'rahim@10ms.com', role: 'TEACHER', branch_id: 'branch-mirpur', hashed_password: '$2b$10$dummy.hash.for.testing' },
      { id: 'teacher-uttara-1', name: 'Fatima Begum', email: 'fatima@10ms.com', role: 'TEACHER', branch_id: 'branch-uttara', hashed_password: '$2b$10$dummy.hash.for.testing' },
      { id: 'teacher-uttara-2', name: 'Karim Uddin', email: 'karim@10ms.com', role: 'TEACHER', branch_id: 'branch-uttara', hashed_password: '$2b$10$dummy.hash.for.testing' },
      { id: 'teacher-mogbazar-1', name: 'Ayesha Rahman', email: 'ayesha@10ms.com', role: 'TEACHER', branch_id: 'branch-mogbazar', hashed_password: '$2b$10$dummy.hash.for.testing' },
      { id: 'teacher-mogbazar-2', name: 'Hasan Ali', email: 'hasan@10ms.com', role: 'TEACHER', branch_id: 'branch-mogbazar', hashed_password: '$2b$10$dummy.hash.for.testing' },
      { id: 'teacher-panthapath-1', name: 'Nusrat Jahan', email: 'nusrat@10ms.com', role: 'TEACHER', branch_id: 'branch-panthapath', hashed_password: '$2b$10$dummy.hash.for.testing' },
      { id: 'teacher-panthapath-2', name: 'Mohammad Ali', email: 'mohammad@10ms.com', role: 'TEACHER', branch_id: 'branch-panthapath', hashed_password: '$2b$10$dummy.hash.for.testing' },
      { id: 'teacher-chittagong-1', name: 'Rashida Khatun', email: 'rashida@10ms.com', role: 'TEACHER', branch_id: 'branch-chittagong', hashed_password: '$2b$10$dummy.hash.for.testing' },
      { id: 'teacher-chittagong-2', name: 'Abdul Rahman', email: 'abdul@10ms.com', role: 'TEACHER', branch_id: 'branch-chittagong', hashed_password: '$2b$10$dummy.hash.for.testing' }
    ]

    console.log('Inserting teachers...')
    const { error: teacherError } = await supabase
      .from('users')
      .upsert(teachers, { onConflict: 'id' })

    if (teacherError) {
      console.error('Error inserting teachers:', teacherError)
      return
    }
    console.log('Teachers inserted successfully!')

    // Generate slots for October 2024
    console.log('Generating October 2024 slots...')
    const slots = []
    const timeSlots = [
      ['09:00', '10:00'],
      ['10:30', '11:30'],
      ['14:00', '15:00'],
      ['15:30', '16:30'],
      ['17:00', '18:00']
    ]

    const branchIds = ['branch-mirpur', 'branch-uttara', 'branch-mogbazar', 'branch-panthapath', 'branch-chittagong']
    const teacherIds = ['teacher-mirpur-1', 'teacher-mirpur-2', 'teacher-uttara-1', 'teacher-uttara-2', 'teacher-mogbazar-1', 'teacher-mogbazar-2', 'teacher-panthapath-1', 'teacher-panthapath-2', 'teacher-chittagong-1', 'teacher-chittagong-2']

    for (let day = 1; day <= 31; day++) {
      const date = `2024-10-${day.toString().padStart(2, '0')}`
      const dayOfWeek = new Date(date).getDay()
      
      // Skip Sundays
      if (dayOfWeek !== 0) {
        for (let branchIndex = 0; branchIndex < branchIds.length; branchIndex++) {
          const branchId = branchIds[branchIndex]
          const teacherId = teacherIds[branchIndex * 2] // Use first teacher for each branch
          
          // Create 2-3 slots per day per branch
          for (let slotIndex = 0; slotIndex < 3; slotIndex++) {
            const timeSlot = timeSlots[slotIndex]
            if (timeSlot) {
              slots.push({
                id: `slot-${branchId}-${date.replace(/-/g, '')}-${slotIndex + 1}`,
                branch_id: branchId,
                teacher_id: teacherId,
                date: date,
                start_time: timeSlot[0],
                end_time: timeSlot[1],
                capacity: slotIndex === 0 ? 2 : 1,
                booked_count: 0,
                is_blocked: false,
                room_number: `Room ${slotIndex + 1}`
              })
            }
          }
        }
      }
    }

    console.log(`Generated ${slots.length} slots. Inserting...`)
    const { error: slotError } = await supabase
      .from('slots')
      .upsert(slots, { onConflict: 'id' })

    if (slotError) {
      console.error('Error inserting slots:', slotError)
      return
    }
    console.log('Slots inserted successfully!')

    console.log('Sample data insertion completed!')
    console.log(`- ${branches.length} branches`)
    console.log(`- ${teachers.length} teachers`)
    console.log(`- ${slots.length} slots for October 2024`)

  } catch (error) {
    console.error('Error inserting sample data:', error)
  }
}

insertSampleData()
