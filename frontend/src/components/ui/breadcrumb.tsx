import React from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Home } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BreadcrumbItem {
  label: string
  href?: string
  current?: boolean
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
  className?: string
  showHome?: boolean
}

const Breadcrumb: React.FC<BreadcrumbProps> = ({ 
  items, 
  className,
  showHome = true 
}) => {
  const allItems = showHome 
    ? [{ label: 'Dashboard', href: '/dashboard' }, ...items]
    : items

  return (
    <nav className={cn('flex items-center space-x-1 text-sm text-gray-500 dark:text-gray-400 mb-6', className)}>
      {allItems.map((item, index) => (
        <React.Fragment key={index}>
          {index > 0 && (
            <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500" />
          )}
          
          {item.current || !item.href ? (
            <span className="text-gray-900 dark:text-white font-medium flex items-center space-x-1">
              {index === 0 && showHome && <Home className="w-4 h-4" />}
              <span>{item.label}</span>
            </span>
          ) : (
            <Link
              to={item.href}
              className="hover:text-gray-700 dark:hover:text-gray-300 flex items-center space-x-1"
            >
              {index === 0 && showHome && <Home className="w-4 h-4" />}
              <span>{item.label}</span>
            </Link>
          )}
        </React.Fragment>
      ))}
    </nav>
  )
}

export { Breadcrumb }
export type { BreadcrumbItem }