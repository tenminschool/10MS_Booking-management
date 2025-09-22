import React from 'react'

const Schedule: React.FC = () => {
  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Schedule</h1>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Available Time Slots</h2>
          
          <div className="grid gap-4">
            <div className="border rounded-lg p-4 hover:bg-gray-50">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-medium">Morning Session</h3>
                  <p className="text-gray-600">9:00 AM - 9:30 AM</p>
                  <p className="text-sm text-gray-500">Dhanmondi Branch</p>
                </div>
                <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                  Book Now
                </button>
              </div>
            </div>
            
            <div className="border rounded-lg p-4 hover:bg-gray-50">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-medium">Afternoon Session</h3>
                  <p className="text-gray-600">2:00 PM - 2:30 PM</p>
                  <p className="text-sm text-gray-500">Gulshan Branch</p>
                </div>
                <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                  Book Now
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Schedule