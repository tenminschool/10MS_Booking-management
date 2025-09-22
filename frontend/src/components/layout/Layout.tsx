import React from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Home, 
  Calendar, 
  BookOpen, 
  GraduationCap, 
  Bell, 
  Settings, 
  LogOut,
  Menu,
  X,
  Users,
  Upload,
  BarChart3,
  Sliders,
  Building
} from 'lucide-react'
import { UserRole } from '@/types'
import { useState } from 'react'

const Layout: React.FC = () => {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  // Base navigation for all users
  const baseNavigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Schedule', href: '/schedule', icon: Calendar },
    { name: 'Bookings', href: '/bookings', icon: BookOpen },
    { name: 'Assessments', href: '/assessments', icon: GraduationCap },
    { name: 'Notifications', href: '/notifications', icon: Bell },
  ]

  // Admin navigation for branch admins and super admins
  const adminNavigation = [
    { name: 'Slot Management', href: '/admin/slots', icon: Sliders },
    { name: 'Student Import', href: '/admin/import', icon: Upload },
    { name: 'User Management', href: '/admin/users', icon: Users },
    { name: 'Reports', href: '/admin/reports', icon: BarChart3 },
  ]

  // Super admin only navigation
  const superAdminNavigation = [
    { name: 'Branch Management', href: '/admin/branches', icon: Building },
    { name: 'System Settings', href: '/admin/settings', icon: Settings },
  ]

  // Combine navigation based on user role
  let navigation = baseNavigation
  
  if (user?.role === UserRole.BRANCH_ADMIN || user?.role === UserRole.SUPER_ADMIN) {
    navigation = [...navigation, ...adminNavigation]
  }
  
  if (user?.role === UserRole.SUPER_ADMIN) {
    navigation = [...navigation, ...superAdminNavigation]
  }

  const isActive = (path: string) => location.pathname === path

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <Link to="/dashboard" className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">10MS</span>
                </div>
                <span className="font-semibold text-gray-900 hidden sm:block">
                  Speaking Test Booking
                </span>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex space-x-1">
              {navigation.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive(item.href)
                        ? 'bg-red-50 text-red-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </Link>
                )
              })}
            </nav>

            {/* User Menu */}
            <div className="flex items-center space-x-4">
              <div className="hidden sm:flex items-center space-x-2">
                <Badge variant="secondary">{user?.role}</Badge>
                <span className="text-sm text-gray-700">{user?.name}</span>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="hidden sm:flex items-center space-x-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </Button>

              {/* Mobile menu button */}
              <Button
                variant="ghost"
                size="sm"
                className="md:hidden"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 bg-white">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center space-x-3 px-3 py-2 rounded-md text-base font-medium ${
                      isActive(item.href)
                        ? 'bg-red-50 text-red-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.name}</span>
                  </Link>
                )
              })}
              
              <div className="border-t border-gray-200 pt-3 mt-3">
                <div className="px-3 py-2">
                  <div className="text-sm text-gray-500">Signed in as</div>
                  <div className="text-sm font-medium text-gray-900">{user?.name}</div>
                  <Badge variant="secondary" className="mt-1">{user?.role}</Badge>
                </div>
                <Button
                  variant="ghost"
                  onClick={handleLogout}
                  className="w-full justify-start px-3 py-2 text-gray-600 hover:text-gray-900"
                >
                  <LogOut className="w-5 h-5 mr-3" />
                  Logout
                </Button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Outlet />
      </main>
    </div>
  )
}

export default Layout