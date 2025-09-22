import React from 'react'

const Notifications: React.FC = () => {
  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-red-600 mb-6">Notifications</h1>
        
        <div className="bg-white rounded-lg shadow-lg p-6 border">
          <h2 className="text-xl font-semibold text-blue-600 mb-4">Recent Notifications</h2>
          
          <div className="space-y-4">
            <div className="border-l-4 border-green-500 bg-green-50 p-4 rounded">
              <div className="flex">
                <div className="flex-1">
                  <h3 className="font-medium text-green-800">Booking Confirmed</h3>
                  <p className="text-green-700 mt-1">Your speaking test has been confirmed for tomorrow at 9:00 AM</p>
                  <p className="text-green-600 text-sm mt-2">2 hours ago</p>
                </div>
              </div>
            </div>
            
            <div className="border-l-4 border-yellow-500 bg-yellow-50 p-4 rounded">
              <div className="flex">
                <div className="flex-1">
                  <h3 className="font-medium text-yellow-800">Reminder</h3>
                  <p className="text-yellow-700 mt-1">Don't forget your speaking test tomorrow at 9:00 AM</p>
                  <p className="text-yellow-600 text-sm mt-2">1 day ago</p>
                </div>
              </div>
            </div>
            
            <div className="border-l-4 border-blue-500 bg-blue-50 p-4 rounded">
              <div className="flex">
                <div className="flex-1">
                  <h3 className="font-medium text-blue-800">System Update</h3>
                  <p className="text-blue-700 mt-1">New features have been added to improve your experience</p>
                  <p className="text-blue-600 text-sm mt-2">3 days ago</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Notifications