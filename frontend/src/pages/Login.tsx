import React, { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { authAPI } from '@/lib/api'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import NeuralNetworkBackground from '@/components/ui/neural-network-background'
// Mock UI components - replace with actual shadcn/ui components when available
const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border border-gray-200/50 dark:border-white/10 rounded-lg shadow-2xl ${className}`}>{children}</div>
)
const CardHeader = ({ children }: { children: React.ReactNode }) => (
  <div className="p-6 pb-4">{children}</div>
)
const CardTitle = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <h3 className={`text-lg font-semibold text-gray-900 dark:text-white ${className}`}>{children}</h3>
)
const CardDescription = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <p className={`text-sm text-gray-600 dark:text-gray-400 mt-1 ${className}`}>{children}</p>
)
const CardContent = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`p-6 pt-0 ${className}`}>{children}</div>
)
const Button = ({ children, className = '', variant = 'default', size = 'default', disabled = false, onClick, type, ...props }: any) => (
  <button 
    type={type}
    className={`px-4 py-2 rounded-md font-medium transition-colors ${
      variant === 'outline' ? 'border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-900 dark:text-white' :
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
    className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 ${className}`}
    {...props}
  />
)
const Label = ({ children, htmlFor, className = '' }: any) => (
  <label htmlFor={htmlFor} className={`block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 ${className}`}>
    {children}
  </label>
)
import { Phone, Mail, Lock, Send, Eye, EyeOff } from 'lucide-react'

const Login: React.FC = () => {
  const navigate = useNavigate()
  const { login } = useAuth()
  
  // Unified login state
  const [loginType, setLoginType] = useState<'phone' | 'email'>('email')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [otp, setOtp] = useState('')
  const [isOtpSent, setIsOtpSent] = useState(false)
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
    onSuccess: (response: any) => {
      console.log('Student login response:', response)
      console.log('Student response data:', response.data)
      
      if (!response.data || !response.data.data) {
        console.error('Invalid student response format:', response)
        return
      }
      
      const { token, user } = response.data.data
      console.log('Student token:', token)
      console.log('Student user:', user)
      
      if (!token || !user) {
        console.error('Missing student token or user data')
        return
      }
      
      login(token, user)
      console.log('Navigating to dashboard...')
      navigate('/dashboard')
    },
    onError: (error) => {
      console.error('Student login error:', error)
    }
  })

  // Unified login mutation that auto-detects user type
  const unifiedLoginMutation = useMutation({
    mutationFn: async (data: { email: string; password: string }) => {
      console.log('🔐 Attempting unified login for:', data.email)
      
      // Try student login first
      try {
        console.log('🔄 Trying student login...')
        const response = await authAPI.loginStudentEmail(data.email, data.password)
        console.log('✅ Student login successful')
        return { data: (response as any).data, userType: 'student' }
      } catch (studentError) {
        console.log('❌ Student login failed, trying staff login...')
        
        // If student login fails, try staff login
        try {
          const response = await authAPI.loginStaff(data.email, data.password)
          console.log('✅ Staff login successful')
          return { data: (response as any).data, userType: 'staff' }
        } catch (staffError) {
          console.log('❌ Both student and staff login failed')
          throw studentError // Throw the original error
        }
      }
    },
    onSuccess: (response: any) => {
      console.log('🎉 Unified login successful:', response.userType)
      console.log('Response data:', response.data)
      
      if (!response.data || !response.data.data) {
        console.error('Invalid response format:', response)
        return
      }
      
      const { token, user } = response.data.data
      console.log('Token:', token)
      console.log('User:', user)
      
      if (!token || !user) {
        console.error('Missing token or user data')
        return
      }
      
      login(token, user)
      console.log('Navigating to dashboard...')
      navigate('/dashboard')
    },
    onError: (error: any) => {
      console.error('❌ Unified login error:', error)
      console.error('Error response:', error.response?.data)
      console.error('Error status:', error.response?.status)
    }
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

  const handleEmailLogin = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('handleEmailLogin - email:', email)
    console.log('handleEmailLogin - password:', password)
    console.log('handleEmailLogin - email length:', email.length)
    if (email && password) {
      unifiedLoginMutation.mutate({ email, password })
    }
  }

  const handleQuickLogin = (email: string, password: string) => {
    console.log('handleQuickLogin called with:', { email, password })
    setEmail(email)
    setPassword(password)
    setLoginType('email')
    // Auto-login with the unified system
    unifiedLoginMutation.mutate({ email, password })
  }

  return (
    <>
      {/* Neural Network Background - Outside of main container */}
      <NeuralNetworkBackground />
      
      <div className="min-h-screen flex items-center justify-center p-2 sm:p-4 relative" style={{ zIndex: 1 }}>
        {/* Theme Toggle - Top Right */}
        <div className="absolute top-4 right-4" style={{ zIndex: 10 }}>
          <ThemeToggle />
        </div>
      
        <div className="w-full max-w-md mx-auto relative" style={{ zIndex: 10 }}>
          {/* Logo and Header */}
          <div className="text-center mb-6 sm:mb-8">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-red-600 rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4">
              <span className="text-white font-bold text-lg sm:text-xl">10MS</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white dark:text-white">Welcome Back</h1>
            <p className="text-sm sm:text-base text-gray-200 dark:text-gray-300 mt-2">Sign in to your speaking test account</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Sign In</CardTitle>
              <CardDescription>
                Enter your credentials to continue
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Login Type Toggle */}
              <div className="flex space-x-1 bg-blue-50 dark:bg-blue-900/20 p-1 rounded-lg mb-4 border border-blue-200 dark:border-blue-800">
                <button
                  type="button"
                  onClick={() => setLoginType('email')}
                  className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-all duration-200 ${
                    loginType === 'email'
                      ? 'bg-blue-500 text-white shadow-md'
                      : 'text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-800/30'
                  }`}
                >
                  <Mail className="w-4 h-4 inline mr-2" />
                  Email
                </button>
                <button
                  type="button"
                  onClick={() => setLoginType('phone')}
                  className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-all duration-200 ${
                    loginType === 'phone'
                      ? 'bg-blue-500 text-white shadow-md'
                      : 'text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-800/30'
                  }`}
                >
                  <Phone className="w-4 h-4 inline mr-2" />
                  Phone
                </button>
              </div>

              {/* Login Forms */}
              {loginType === 'phone' ? (
                !isOtpSent ? (
                  <form onSubmit={handleSendOtp} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-sm font-medium flex items-center gap-2">
                        Phone Number
                        <Phone className="h-4 w-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+880 1234 567890"
                        value={phoneNumber}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPhoneNumber(e.target.value)}
                        className="px-3 h-10 sm:h-11 text-sm sm:text-base"
                        required
                      />
                    </div>
                    
                    <Button 
                      type="submit" 
                      className="w-full bg-blue-600 hover:bg-blue-700 h-10 sm:h-11 text-sm sm:text-base"
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
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-sm text-green-700 dark:text-green-400">
                      OTP sent to {phoneNumber}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="otp" className="text-sm font-medium">Enter OTP</Label>
                      <Input
                        id="otp"
                        type="text"
                        placeholder="123456"
                        value={otp}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOtp(e.target.value)}
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
                        className="flex-1 bg-blue-600 hover:bg-blue-700 h-10 sm:h-11 text-sm sm:text-base"
                        disabled={studentLoginMutation.isPending}
                      >
                        {studentLoginMutation.isPending ? 'Signing in...' : 'Sign In'}
                      </Button>
                    </div>
                  </form>
                )
              ) : (
                <form onSubmit={handleEmailLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium flex items-center gap-2">
                      Email
                      <Mail className="h-4 w-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="your.email@10minuteschool.com"
                      value={email}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                      className="px-3 h-10 sm:h-11 text-sm sm:text-base"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium flex items-center gap-2">
                      Password
                      <Lock className="h-4 w-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                        className="px-3 pr-10 h-10 sm:h-11 text-sm sm:text-base"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full h-10 sm:h-11 text-sm sm:text-base bg-blue-600 hover:bg-blue-700"
                    disabled={unifiedLoginMutation.isPending}
                  >
                    {unifiedLoginMutation.isPending ? 'Signing in...' : 'Sign In'}
                  </Button>
                </form>
              )}

              {/* Error Messages */}
              {(sendOtpMutation.error || studentLoginMutation.error || unifiedLoginMutation.error) && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-xs sm:text-sm text-red-700">
                    {sendOtpMutation.error?.message || 
                     studentLoginMutation.error?.message || 
                     unifiedLoginMutation.error?.message || 
                     'An error occurred. Please try again.'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Demo Credentials - Unified */}
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-sm text-gray-700 dark:text-gray-300">Demo Credentials</CardTitle>
              <CardDescription className="text-xs">
                Click to auto-login with demo accounts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Super Admin */}
              <div 
                className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                onClick={() => handleQuickLogin('admin@10minuteschool.com', 'admin123')}
              >
                <div className="text-xs font-semibold text-red-800 dark:text-red-300 mb-1">Super Admin</div>
                <div className="text-xs text-red-700 dark:text-red-400 space-y-1">
                  <div><strong>Email:</strong> admin@10minuteschool.com</div>
                  <div><strong>Password:</strong> admin123</div>
                </div>
              </div>

              {/* Branch Admin */}
              <div 
                className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                onClick={() => handleQuickLogin('dhanmondi@10minuteschool.com', 'admin123')}
              >
                <div className="text-xs font-semibold text-blue-800 dark:text-blue-300 mb-1">Branch Admin</div>
                <div className="text-xs text-blue-700 dark:text-blue-400 space-y-1">
                  <div><strong>Email:</strong> dhanmondi@10minuteschool.com</div>
                  <div><strong>Password:</strong> admin123</div>
                </div>
              </div>

              {/* Teacher */}
              <div 
                className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 cursor-pointer hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                onClick={() => handleQuickLogin('sarah@10minuteschool.com', 'teacher123')}
              >
                <div className="text-xs font-semibold text-green-800 dark:text-green-300 mb-1">Teacher</div>
                <div className="text-xs text-green-700 dark:text-green-400 space-y-1">
                  <div><strong>Email:</strong> sarah@10minuteschool.com</div>
                  <div><strong>Password:</strong> teacher123</div>
                </div>
              </div>

              {/* Student */}
              <div 
                className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800 cursor-pointer hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
                onClick={() => handleQuickLogin('student@10minuteschool.com', 'student123')}
              >
                <div className="text-xs font-semibold text-purple-800 dark:text-purple-300 mb-1">Student</div>
                <div className="text-xs text-purple-700 dark:text-purple-400 space-y-1">
                  <div><strong>Email:</strong> student@10minuteschool.com</div>
                  <div><strong>Password:</strong> student123</div>
                  <div className="text-xs text-purple-600 dark:text-purple-500 mt-2">Or use phone/OTP:</div>
                  <div><strong>Phone:</strong> +8801712345678</div>
                  <div><strong>OTP:</strong> 123456 (any 6-digit number)</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="text-center mt-6 sm:mt-8 text-xs sm:text-sm text-gray-300 dark:text-gray-400">
            <p>Need help? Contact support at</p>
            <p className="font-medium break-all sm:break-normal">support@10minuteschool.com</p>
          </div>
        </div>
      </div>
    </>
  )
}

export default Login