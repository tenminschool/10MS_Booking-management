import React, { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface DropdownMenuProps {
  children: React.ReactNode
  className?: string
}

interface DropdownMenuTriggerProps {
  children: React.ReactNode
  className?: string
  asChild?: boolean
}

interface DropdownMenuContentProps {
  children: React.ReactNode
  className?: string
  align?: 'start' | 'center' | 'end'
}

interface DropdownMenuItemProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
  disabled?: boolean
  asChild?: boolean
}

const DropdownMenuContext = React.createContext<{
  isOpen: boolean
  setIsOpen: (open: boolean) => void
}>({
  isOpen: false,
  setIsOpen: () => {}
})

const DropdownMenu: React.FC<DropdownMenuProps> = ({ children, className }) => {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  return (
    <DropdownMenuContext.Provider value={{ isOpen, setIsOpen }}>
      <div ref={dropdownRef} className={cn('relative', className)}>
        {children}
      </div>
    </DropdownMenuContext.Provider>
  )
}

const DropdownMenuTrigger: React.FC<DropdownMenuTriggerProps> = ({ 
  children, 
  className,
  asChild = false 
}) => {
  const { isOpen, setIsOpen } = React.useContext(DropdownMenuContext)

  const handleClick = () => {
    setIsOpen(!isOpen)
  }

  if (asChild) {
    const childElement = children as React.ReactElement<any>
    return React.cloneElement(childElement, {
      onClick: handleClick,
      className: cn(className, childElement.props.className)
    })
  }

  return (
    <button
      onClick={handleClick}
      className={cn('outline-none', className)}
    >
      {children}
    </button>
  )
}

const DropdownMenuContent: React.FC<DropdownMenuContentProps> = ({ 
  children, 
  className,
  align = 'end'
}) => {
  const { isOpen } = React.useContext(DropdownMenuContext)

  if (!isOpen) return null

  const alignmentClasses = {
    start: 'left-0',
    center: 'left-1/2 transform -translate-x-1/2',
    end: 'right-0'
  }

  return (
    <div
      className={cn(
        'absolute top-full mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50',
        alignmentClasses[align],
        className
      )}
    >
      {children}
    </div>
  )
}

const DropdownMenuItem: React.FC<DropdownMenuItemProps> = ({ 
  children, 
  className,
  onClick,
  disabled = false,
  asChild = false
}) => {
  const { setIsOpen } = React.useContext(DropdownMenuContext)

  const handleClick = () => {
    if (!disabled && onClick) {
      onClick()
      setIsOpen(false)
    }
  }

  if (asChild) {
    const childElement = children as React.ReactElement<any>
    return React.cloneElement(childElement, {
      onClick: handleClick,
      className: cn(
        'w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2',
        className,
        childElement.props.className
      )
    })
  }

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={cn(
        'w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2',
        className
      )}
    >
      {children}
    </button>
  )
}

const DropdownMenuSeparator: React.FC<{ className?: string }> = ({ className }) => {
  return <div className={cn('h-px bg-gray-200 dark:bg-gray-700 my-1', className)} />
}

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator
}