import React from 'react'
import { useTheme } from '@/contexts/ThemeContext'
import { Sun, Moon } from 'lucide-react'

interface ThemeToggleProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ 
  className = '', 
  size = 'md'
}) => {
  const { theme, toggleTheme } = useTheme()

  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-9 w-9',
    lg: 'h-10 w-10'
  }

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  }

  return (
    <button
      onClick={toggleTheme}
      className={`${sizeClasses[size]} ${className} inline-flex items-center justify-center rounded-md text-sm font-medium transition-all duration-200 hover:scale-105 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border-none cursor-pointer`}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      {theme === 'light' ? (
        <Moon className={iconSizes[size]} />
      ) : (
        <Sun className={iconSizes[size]} />
      )}
    </button>
  )
}

export default ThemeToggle
