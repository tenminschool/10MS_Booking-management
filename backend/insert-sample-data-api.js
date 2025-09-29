const axios = require('axios')
require('dotenv').config()

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001/api'

// Mock authentication token (in real scenario, you'd need to login first)
const AUTH_TOKEN = 'mock-token-for-testing'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Authorization': `Bearer ${AUTH_TOKEN}`,
    'Content-Type': 'application/json'
  }
})

async function insertSampleData() {
  try {
    console.log('Starting to insert sample data via API...')

    // Insert branches using API
    const branches = [
      { name: 'Mirpur Branch', address: 'House 12, Road 7, Mirpur 1, Dhaka 1216', contactNumber: '+880-2-9001234' },
      { name: 'Uttara Branch', address: 'House 15, Sector 7, Uttara, Dhaka 1230', contactNumber: '+880-2-9001235' },
      { name: 'Mogbazar Branch', address: 'House 8, Mogbazar, Dhaka 1217', contactNumber: '+880-2-9001236' },
      { name: 'Panthapath Branch', address: 'House 25, Panthapath, Dhaka 1205', contactNumber: '+880-2-9001237' },
      { name: 'Chittagong Branch', address: 'House 30, Agrabad, Chittagong 4100', contactNumber: '+880-2-9001238' }
    ]

    console.log('Inserting branches via API...')
    const createdBranches = []
    
    for (const branch of branches) {
      try {
        const response = await api.post('/branches', branch)
        createdBranches.push(response.data.branch)
        console.log(`✅ Created branch: ${branch.name}`)
      } catch (error) {
        console.log(`⚠️  Branch ${branch.name} might already exist or API error:`, error.response?.data?.message || error.message)
      }
    }

    console.log(`Created ${createdBranches.length} branches`)

    // For now, just show the SQL script that should be run
    console.log('\n📝 To insert October 2024 slots, please run the SQL script in your Supabase SQL Editor:')
    console.log('File: insert-october-slots.sql')
    console.log('\nThis will create:')
    console.log('- 5 branches (Mirpur, Uttara, Mogbazar, Panthapath, Chittagong)')
    console.log('- 10 teachers (2 per branch)')
    console.log('- October 2024 slots for all branches')
    console.log('- Sample bookings')

  } catch (error) {
    console.error('Error inserting sample data:', error.message)
    if (error.response) {
      console.error('Response data:', error.response.data)
    }
  }
}

insertSampleData()
