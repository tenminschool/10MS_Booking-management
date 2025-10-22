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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-b border-gray-200/50 dark:border-gray-700/50 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center flex-shrink-0">
              <Link 
                to={user?.role === UserRole.SUPER_ADMIN || user?.role === UserRole.BRANCH_ADMIN ? '/admin/dashboard' : '/dashboard'} 
                className="flex items-center space-x-3 hover:opacity-80 transition-all duration-200 group"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-200">
                  <span className="text-white font-bold text-sm">10MS</span>
                </div>
                <span className="font-bold text-gray-900 dark:text-white hidden sm:block text-lg">
                  Booking Management
                </span>
              </Link>
            </div>

            {/* Desktop Navigation - Fixed overflow with scroll */}
            <nav className="hidden lg:flex space-x-1 flex-1 justify-center max-w-4xl mx-8">
              <div className="flex space-x-1 overflow-x-auto scrollbar-hide">
                {navigation.map((item) => {
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center space-x-2 whitespace-nowrap ${
                        isActive(item.href)
                          ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg transform scale-105'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white hover:shadow-md'
                      }`}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span>{item.name}</span>
                    </Link>
                  )
                })}
              </div>
            </nav>

            {/* Right side - User menu and theme toggle */}
            <div className="flex items-center space-x-3 flex-shrink-0">
              <ThemeToggle />

              {/* User dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center space-x-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-semibold shadow-md">
                      {user?.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <span className="hidden sm:block text-sm font-medium text-gray-700 dark:text-gray-300">
                      {user?.name || 'User'}
                    </span>
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md border border-gray-200/50 dark:border-gray-700/50 shadow-xl">
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
                className="lg:hidden hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-200/50 dark:border-gray-700/50 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md">
            <div className="px-2 pt-2 pb-3 space-y-1 max-h-96 overflow-y-auto">
              {navigation.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`block px-3 py-2 rounded-lg text-base font-medium transition-all duration-200 flex items-center space-x-3 ${
                      isActive(item.href)
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
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