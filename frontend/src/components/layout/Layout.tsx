import React from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { 
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu'
import { 
  Calendar, 
  BookOpen, 
  GraduationCap, 
  Settings, 
  LogOut,
  Menu,
  X,
  Users,
  Sliders,
  Building,
  User,
  ChevronDown,
  Home,
  Crown,
  Shield,
  Layers
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

  // Get navigation based on user role
  const getNavigation = () => {
    if (!user) return []

    // Super Admins get simplified navigation
    if (user.role === UserRole.SUPER_ADMIN) {
      return [
        { name: 'Home', href: '/admin/dashboard', icon: Home },
        { name: 'Slots', href: '/admin/slots', icon: Sliders },
        { name: 'Users', href: '/admin/users', icon: Users },
        { name: 'Bookings', href: '/admin/bookings', icon: BookOpen },
        { name: 'Assessments', href: '/admin/assessments', icon: GraduationCap },
        { name: 'Branches', href: '/admin/branches', icon: Building },
        { name: 'Notifications', href: '/admin/notifications', icon: Settings },
      ]
    }

    // Branch Admins get admin dashboard instead of regular dashboard
    if (user.role === UserRole.BRANCH_ADMIN) {
      return [
        { name: 'Admin Dashboard', href: '/admin/dashboard', icon: Home },
        { name: 'Slots', href: '/admin/slots', icon: Sliders },
        { name: 'Users', href: '/admin/users', icon: Users },
        { name: 'Bookings', href: '/admin/bookings', icon: BookOpen },
        { name: 'Assessments', href: '/admin/assessments', icon: GraduationCap },
      ]
    }

    // Teachers and Students get regular pages
    if (user.role === UserRole.STUDENT) {
      return [
        { name: 'Dashboard', href: '/dashboard', icon: Home },
        { name: 'Schedule', href: '/schedule', icon: Calendar },
        { name: 'Assessments', href: '/assessments', icon: GraduationCap },
      ]
    }
    
    // Teachers get all pages including bookings
    return [
      { name: 'Dashboard', href: '/dashboard', icon: Home },
      { name: 'Schedule', href: '/schedule', icon: Calendar },
      { name: 'Bookings', href: '/bookings', icon: BookOpen },
      { name: 'Assessments', href: '/assessments', icon: GraduationCap },
    ]
  }

  const navigation = getNavigation()

  const isActive = (path: string) => location.pathname === path

  const getRoleBadge = () => {
    switch (user?.role) {
      case UserRole.SUPER_ADMIN:
        return <Badge variant="default" className="flex items-center space-x-1 bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-400"><Crown className="w-3 h-3" />Super Admin</Badge>
      case UserRole.BRANCH_ADMIN:
        return <Badge variant="default" className="flex items-center space-x-1"><Shield className="w-3 h-3" />Branch Admin</Badge>
      case UserRole.TEACHER:
        return <Badge variant="default" className="flex items-center space-x-1 bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400"><GraduationCap className="w-3 h-3" />Teacher</Badge>
      case UserRole.STUDENT:
        return <Badge variant="default" className="flex items-center space-x-1 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400"><User className="w-3 h-3" />Student</Badge>
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-background dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <Link 
                to={user?.role === UserRole.SUPER_ADMIN || user?.role === UserRole.BRANCH_ADMIN ? '/admin/dashboard' : '/dashboard'} 
                className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
              >
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">10MS</span>
                </div>
                <span className="font-semibold text-gray-900 dark:text-white hidden sm:block">
                  Booking Management
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
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-2 ${
                      isActive(item.href)
                        ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </Link>
                )
              })}
            </nav>

            {/* Right side - User menu and theme toggle */}
            <div className="flex items-center space-x-4">
              <ThemeToggle />

              {/* User dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                      {user?.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <span className="hidden sm:block text-sm font-medium text-gray-700 dark:text-gray-300">
                      {user?.name || 'User'}
                    </span>
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-3 py-2">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{user?.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
                    <div className="mt-1">
                      {getRoleBadge()}
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/profile" className="flex items-center space-x-2 w-full">
                      <User className="w-4 h-4" />
                      <span>Profile</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="flex items-center space-x-2 text-orange-600 dark:text-orange-400">
                    <LogOut className="w-4 h-4" />
                    <span>Sign out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Mobile menu button */}
              <Button
                variant="ghost"
                size="sm"
                className="md:hidden"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`block px-3 py-2 rounded-md text-base font-medium transition-colors flex items-center space-x-2 ${
                      isActive(item.href)
                        ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  )
}

export default Layout