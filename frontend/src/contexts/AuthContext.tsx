import React, { createContext, useContext, useState, useEffect } from 'react'
import type { User } from '@/types'
import { authAPI } from '@/lib/api'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (token: string, user: User) => void
  logout: () => void
  updateUser: (user: User) => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token')
      const savedUser = localStorage.getItem('user')
      
      console.log('Auth init - Token:', token ? 'exists' : 'missing')
      console.log('Auth init - User:', savedUser ? 'exists' : 'missing')
      
      if (token && savedUser) {
        try {
          // Parse the stored user data first
          const parsedUser = JSON.parse(savedUser)
          
          // For student tokens, use stored data directly (no server verification needed)
          if (token.startsWith('student_')) {
            console.log('Student token detected, using stored user data')
            setUser(parsedUser)
          } else {
            // For staff tokens, verify with server
            console.log('Staff token detected, verifying with server...')
            const response = await authAPI.getCurrentUser()
            console.log('Token verification successful:', response)
            setUser((response as any).data)
            console.log('User set from verified data:', (response as any).data)
          }
        } catch (error) {
          console.log('Token verification failed:', error)
          
          // For student tokens, still try to use stored data
          if (token.startsWith('student_')) {
            try {
              const parsedUser = JSON.parse(savedUser)
              console.log('Student token verification failed, but using stored user data')
              setUser(parsedUser)
            } catch (parseError) {
              console.log('Failed to parse stored user data, clearing auth')
              localStorage.removeItem('token')
              localStorage.removeItem('user')
              setUser(null)
            }
          } else {
            // For other tokens, clear auth data on verification failure
            console.log('Non-student token verification failed, clearing auth data')
            localStorage.removeItem('token')
            localStorage.removeItem('user')
            setUser(null)
          }
        }
      } else {
        console.log('No stored auth data, setting user to null')
        setUser(null)
      }
      
      setIsLoading(false)
    }

    initAuth()
  }, [])

  const login = (token: string, userData: User) => {
    console.log('Login function called with:', { token: token ? 'exists' : 'missing', userData })
    
    if (!token || !userData) {
      console.error('Login failed: missing token or userData')
      return
    }
    
    try {
      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(userData))
      setUser(userData)
      console.log('User set in context:', userData)
      console.log('Token stored:', localStorage.getItem('token') ? 'yes' : 'no')
      console.log('User stored:', localStorage.getItem('user') ? 'yes' : 'no')
      console.log('isAuthenticated will be:', !!userData)
    } catch (error) {
      console.error('Error storing login data:', error)
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
  }

  const updateUser = (userData: User) => {
    localStorage.setItem('user', JSON.stringify(userData))
    setUser(userData)
  }

  const value = {
    user,
    isLoading,
    login,
    logout,
    updateUser,
    isAuthenticated: !!user,
  }

  // Debug logging
  console.log('AuthContext render - user:', user, 'isAuthenticated:', !!user, 'isLoading:', isLoading)

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}