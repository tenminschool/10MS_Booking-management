import { useState } from 'react'
import { Button } from '@/components/ui/button'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold text-primary">
              10 Minute School
            </h1>
            <h2 className="text-2xl font-semibold">
              Speaking Test Booking System
            </h2>
            <p className="text-muted-foreground">
              A comprehensive booking management system for English Learning Centers
            </p>
          </div>
          
          <div className="space-y-4">
            <div className="flex justify-center gap-4">
              <Button onClick={() => setCount((count) => count + 1)}>
                Count is {count}
              </Button>
              <Button variant="outline">
                Secondary Button
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold text-primary">Multi-Branch</h3>
                <p className="text-sm text-muted-foreground">Book across different branches</p>
              </div>
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold text-primary">Real-time</h3>
                <p className="text-sm text-muted-foreground">Live booking updates</p>
              </div>
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold text-primary">IELTS Scoring</h3>
                <p className="text-sm text-muted-foreground">Assessment with rubrics</p>
              </div>
            </div>
          </div>
          
          <div className="text-sm text-muted-foreground">
            <p>✅ Frontend: React + TypeScript + Vite</p>
            <p>✅ UI: Shadcn/ui + Tailwind CSS</p>
            <p>✅ Backend: Express.js + Prisma + PostgreSQL</p>
            <p>✅ 10 Minute School Branding Applied</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App