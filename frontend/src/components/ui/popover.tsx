import * as React from 'react'
import { useState, useRef, useEffect, useContext } from 'react'
import { cn } from '@/lib/utils'

interface PopoverProps {
  children: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

interface PopoverTriggerProps {
  children: React.ReactNode
  asChild?: boolean
  className?: string
}

interface PopoverContentProps {
  children: React.ReactNode
  className?: string
  align?: 'start' | 'center' | 'end'
}

const PopoverContext = React.createContext<{
  open: boolean
  setOpen: (open: boolean) => void
}>({
  open: false,
  setOpen: () => {}
})

const Popover: React.FC<PopoverProps> = ({ children, open: controlledOpen, onOpenChange }) => {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen
  const setOpen = (newOpen: boolean) => {
    if (controlledOpen === undefined) {
      setInternalOpen(newOpen)
    }
    onOpenChange?.(newOpen)
  }

  return (
    <PopoverContext.Provider value={{ open, setOpen }}>
      <div className="relative">
        {children}
      </div>
    </PopoverContext.Provider>
  )
}

const PopoverTrigger: React.FC<PopoverTriggerProps> = ({ children, asChild = false, className }) => {
  const { open, setOpen } = useContext(PopoverContext)

  if (asChild) {
    const childElement = children as React.ReactElement<any>
    return React.cloneElement(childElement, {
      onClick: () => setOpen(!open),
      className: cn(className, childElement.props.className)
    })
  }

  return (
    <button
      onClick={() => setOpen(!open)}
      className={cn(className)}
    >
      {children}
    </button>
  )
}

const PopoverContent: React.FC<PopoverContentProps> = ({ 
  children, 
  className,
  align = 'center'
}) => {
  const { open, setOpen } = useContext(PopoverContext)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contentRef.current && !contentRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open, setOpen])

  if (!open) return null

  const alignmentClasses = {
    start: 'left-0',
    center: 'left-1/2 transform -translate-x-1/2',
    end: 'right-0'
  }

  return (
    <div
      ref={contentRef}
      className={cn(
        'absolute top-full mt-1 z-50 w-72 rounded-md border bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-lg p-4',
        alignmentClasses[align],
        className
      )}
    >
      {children}
    </div>
  )
}

export { Popover, PopoverTrigger, PopoverContent }
