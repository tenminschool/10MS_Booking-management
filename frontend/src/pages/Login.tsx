import React, { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { authAPI } from '@/lib/api'
import { getRoleBasedDashboardRoute } from '@/lib/roleRouting'
import { UserRole } from '@/types'
// Mock UI components - replace with actual shadcn/ui components when available
const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-white border rounded-lg shadow-sm ${className}`}>{children}</div>
)
const CardHeader = ({ children }: { children: React.ReactNode }) => (
  <div className="p-6 pb-4">{children}</div>
)
const CardTitle = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <h3 className={`text-lg font-semibold ${className}`}>{children}</h3>
)
const CardDescription = ({ children }: { children: React.ReactNode }) => (
  <p className="text-sm text-gray-600 mt-1">{children}</p>
)
const CardContent = ({ children }: { children: React.ReactNode }) => (
  <div className="p-6 pt-0">{children}</div>
)
const Button = ({ children, className = '', variant = 'default', size = 'default', disabled = false, onClick, type, ...props }: any) => (
  <button 
    type={type}
    className={`px-4 py-2 rounded-md font-medium transition-colors ${
      variant === 'outline' ? 'border border-gray-300 bg-white hover:bg-gray-50' :
      variant === 'destructive' ? 'bg-red-600 text-white hover:bg-red-700' :
      'bg-blue-600 text-white hover:bg-blue-700'
    } ${size === 'sm' ? 'px-3 py-1 text-sm' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    disabled={disabled}
    onClick={onClick}
    {...props}
  >
    {children}
  </button>
)
const Input = ({ className = '', ...props }: any) => (
  <input 
    className={`w-full py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
    {...props}
  />
)
const Label = ({ children, htmlFor, className = '' }: any) => (
  <label htmlFor={htmlFor} className={`block text-sm font-medium text-gray-700 mb-1 ${className}`}>
    {children}
  </label>
)
const Tabs = ({ children, value, onValueChange }: any) => (
  <div data-value={value} data-onvaluechange={onValueChange}>
    {children}
  </div>
)
const TabsList = ({ children, className = '' }: any) => (
  <div className={`flex bg-gray-100 rounded-lg p-1 ${className}`}>
    {children}
  </div>
)
const TabsTrigger = ({ children, value, className = '' }: any) => (
  <button className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors hover:bg-white ${className}`} data-value={value}>
    {children}
  </button>
)
const TabsContent = ({ children, value, className = '' }: any) => (
  <div className={`mt-4 ${className}`} data-value={value}>
    {children}
  </div>
)
import { Phone, Mail, Lock, Send, Eye, EyeOff } from 'lucide-react'

const Login: React.FC = () => {
  const navigate = useNavigate()
  const { login } = useAuth()
  
  // Student login state
  const [phoneNumber, setPhoneNumber] = useState('')
  const [otp, setOtp] = useState('')
  const [isOtpSent, setIsOtpSent] = useState(false)
  
  // Staff login state
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // Send OTP mutation
  const sendOtpMutation = useMutation({
    mutationFn: (phone: string) => authAPI.sendOTP(phone),
    onSuccess: () => {
      setIsOtpSent(true)
    },
  })

  // Student login mutation
  const studentLoginMutation = useMutation({
    mutationFn: (data: { phoneNumber: string; otp: string }) => 
      authAPI.loginStudent(data.phoneNumber, data.otp),
    onSuccess: (response) => {
      const { token, user } = response.data
      login(token, user)
      // All users go to the same dashboard page, but dashboard renders differently based on role
      navigate('/dashboard')
    },
  })

  // Staff login mutation
  const staffLoginMutation = useMutation({
    mutationFn: (data: { email: string; password: string }) => 
      authAPI.loginStaff(data.email, data.password),
    onSuccess: (response) => {
      const { token, user } = response.data
      login(token, user)
      // All users go to the same dashboard page, but dashboard renders differently based on role
      navigate('/dashboard')
    },
  })

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault()
    if (phoneNumber) {
      sendOtpMutation.mutate(phoneNumber)
    }
  }

  const handleStudentLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (phoneNumber && otp) {
      studentLoginMutation.mutate({ phoneNumber, otp })
    }
  }

  const handleStaffLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (email && password) {
      staffLoginMutation.mutate({ email, password })
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-2 sm:p-4">
      <div className="w-full max-w-md mx-auto">
        {/* Logo and Header */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-red-600 rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4">
            <span className="text-white font-bold text-lg sm:text-xl">10MS</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Welcome Back</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-2">Sign in to your speaking test account</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
            <CardDescription>
              Choose your account type to continue
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="student" className="w-full">
              <TabsList className="grid w-full grid-cols-2 text-sm sm:text-base">
                <TabsTrigger value="student" className="text-xs sm:text-sm">Student</TabsTrigger>
                <TabsTrigger value="staff" className="text-xs sm:text-sm">Staff</TabsTrigger>
              </TabsList>
              
              {/* Student Login */}
              <TabsContent value="student" className="space-y-4">
                {!isOtpSent ? (
                  <form onSubmit={handleSendOtp} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-sm font-medium flex items-center gap-2">
                        Phone Number
                        <Phone className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+880 1234 567890"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="px-3 h-10 sm:h-11 text-sm sm:text-base"
                        required
                      />
                    </div>
                    
                    <Button 
                      type="submit" 
                      className="w-full bg-red-600 hover:bg-red-700 h-10 sm:h-11 text-sm sm:text-base"
                      disabled={sendOtpMutation.isPending}
                    >
                      {sendOtpMutation.isPending ? (
                        'Sending...'
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Send OTP
                        </>
                      )}
                    </Button>
                  </form>
                ) : (
                  <form onSubmit={handleStudentLogin} className="space-y-4">
                    <div className="p-3 bg-green-50 rounded-lg text-sm text-green-700">
                      OTP sent to {phoneNumber}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="otp" className="text-sm font-medium">Enter OTP</Label>
                      <Input
                        id="otp"
                        type="text"
                        placeholder="123456"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        maxLength={6}
                        className="px-3 h-10 sm:h-11 text-sm sm:text-base text-center tracking-widest"
                        required
                      />
                    </div>
                    
                    <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsOtpSent(false)
                          setOtp('')
                        }}
                        className="flex-1 h-10 sm:h-11 text-sm sm:text-base"
                      >
                        Back
                      </Button>
                      <Button 
                        type="submit" 
                        className="flex-1 bg-red-600 hover:bg-red-700 h-10 sm:h-11 text-sm sm:text-base"
                        disabled={studentLoginMutation.isPending}
                      >
                        {studentLoginMutation.isPending ? 'Signing in...' : 'Sign In'}
                      </Button>
                    </div>
                  </form>
                )}
              </TabsContent>
              
              {/* Staff Login */}
              <TabsContent value="staff" className="space-y-4">
                <form onSubmit={handleStaffLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium flex items-center gap-2">
                      Email
                      <Mail className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="your.email@10minuteschool.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="px-3 h-10 sm:h-11 text-sm sm:text-base"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium flex items-center gap-2">
                      Password
                      <Lock className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="px-3 pr-10 h-10 sm:h-11 text-sm sm:text-base"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full bg-red-600 hover:bg-red-700 h-10 sm:h-11 text-sm sm:text-base"
                    disabled={staffLoginMutation.isPending}
                  >
                    {staffLoginMutation.isPending ? 'Signing in...' : 'Sign In'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            {/* Error Messages */}
            {(sendOtpMutation.error || studentLoginMutation.error || staffLoginMutation.error) && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-xs sm:text-sm text-red-700">
                  {sendOtpMutation.error?.message || 
                   studentLoginMutation.error?.message || 
                   staffLoginMutation.error?.message || 
                   'An error occurred. Please try again.'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dummy Credentials for Testing */}
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-sm text-gray-700">Test Credentials</CardTitle>
            <CardDescription className="text-xs">
              Use these credentials to test different user roles
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Super Admin */}
            <div className="p-3 bg-red-50 rounded-lg border border-red-200">
              <div className="text-xs font-semibold text-red-800 mb-1">Super Admin</div>
              <div className="text-xs text-red-700 space-y-1">
                <div><strong>Email:</strong> admin@10minuteschool.com</div>
                <div><strong>Password:</strong> admin123</div>
              </div>
            </div>

            {/* Branch Admin */}
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-xs font-semibold text-blue-800 mb-1">Branch Admin</div>
              <div className="text-xs text-blue-700 space-y-1">
                <div><strong>Email:</strong> dhanmondi@10minuteschool.com</div>
                <div><strong>Password:</strong> admin123</div>
              </div>
            </div>

            {/* Teacher */}
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="text-xs font-semibold text-green-800 mb-1">Teacher</div>
              <div className="text-xs text-green-700 space-y-1">
                <div><strong>Email:</strong> sarah@10minuteschool.com</div>
                <div><strong>Password:</strong> teacher123</div>
              </div>
            </div>

            {/* Student */}
            <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
              <div className="text-xs font-semibold text-purple-800 mb-1">Student</div>
              <div className="text-xs text-purple-700 space-y-1">
                <div><strong>Phone:</strong> +8801712345678</div>
                <div><strong>OTP:</strong> 123456 (any 6-digit number)</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-6 sm:mt-8 text-xs sm:text-sm text-gray-600">
          <p>Need help? Contact support at</p>
          <p className="font-medium break-all sm:break-normal">support@10minuteschool.com</p>
        </div>
      </div>
    </div>
  )
}

export default Login