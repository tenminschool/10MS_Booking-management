import React, { createContext, useContext, useState, useEffect } from 'react'
import type { User } from '@/types'

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
    const initAuth = () => {
      const token = localStorage.getItem('token')
      const savedUser = localStorage.getItem('user')
      
      console.log('Auth init - Token:', token ? 'exists' : 'missing')
      console.log('Auth init - User:', savedUser ? 'exists' : 'missing')
      
      if (token && savedUser) {
        try {
          // Parse the stored user data and use it directly for mock authentication
          const parsedUser = JSON.parse(savedUser)
          console.log('Using stored user data for mock authentication:', parsedUser)
          setUser(parsedUser)
        } catch (error) {
          console.log('Failed to parse stored user data, clearing auth:', error)
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          setUser(null)
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