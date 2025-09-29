import * as React from "react"
import { cn } from "@/lib/utils"

interface TooltipProps {
  children: React.ReactNode
  content: string
  side?: 'top' | 'bottom' | 'left' | 'right'
  className?: string
  disabled?: boolean
}

export const Tooltip: React.FC<TooltipProps> = ({ 
  children, 
  content, 
  side = 'top', 
  className = '',
  disabled = false 
}) => {
  const [isVisible, setIsVisible] = React.useState(false)
  const [position, setPosition] = React.useState({ x: 0, y: 0 })
  const triggerRef = React.useRef<HTMLDivElement>(null)

  const getTooltipPosition = React.useCallback(() => {
    if (!triggerRef.current) return

    const rect = triggerRef.current.getBoundingClientRect()
    const tooltipWidth = 200 // Approximate tooltip width
    const tooltipHeight = 40 // Approximate tooltip height
    const offset = 8

    let x = 0
    let y = 0

    switch (side) {
      case 'top':
        x = rect.left + rect.width / 2 - tooltipWidth / 2
        y = rect.top - tooltipHeight - offset
        break
      case 'bottom':
        x = rect.left + rect.width / 2 - tooltipWidth / 2
        y = rect.bottom + offset
        break
      case 'left':
        x = rect.left - tooltipWidth - offset
        y = rect.top + rect.height / 2 - tooltipHeight / 2
        break
      case 'right':
        x = rect.right + offset
        y = rect.top + rect.height / 2 - tooltipHeight / 2
        break
    }

    // Keep tooltip within viewport
    x = Math.max(8, Math.min(x, window.innerWidth - tooltipWidth - 8))
    y = Math.max(8, Math.min(y, window.innerHeight - tooltipHeight - 8))

    setPosition({ x, y })
  }, [side])

  const handleMouseEnter = () => {
    if (!disabled) {
      getTooltipPosition()
      setIsVisible(true)
    }
  }

  const handleMouseLeave = () => {
    setIsVisible(false)
  }

  if (disabled) {
    return <>{children}</>
  }

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="inline-block"
      >
        {children}
      </div>
      {isVisible && (
        <div
          className={cn(
            "fixed z-50 px-2 py-1 text-xs text-white bg-gray-900 rounded shadow-lg pointer-events-none",
            "animate-in fade-in-0 zoom-in-95",
            className
          )}
          style={{
            left: position.x,
            top: position.y,
          }}
        >
          {content}
          {/* Arrow */}
          <div
            className={cn(
              "absolute w-2 h-2 bg-gray-900 transform rotate-45",
              side === 'top' && "bottom-[-4px] left-1/2 -translate-x-1/2",
              side === 'bottom' && "top-[-4px] left-1/2 -translate-x-1/2",
              side === 'left' && "right-[-4px] top-1/2 -translate-y-1/2",
              side === 'right' && "left-[-4px] top-1/2 -translate-y-1/2"
            )}
          />
        </div>
      )}
    </>
  )
}

// Convenience hook for tooltips
export const useTooltip = (content: string, side: TooltipProps['side'] = 'top') => {
  return {
    content,
    side,
  }
}
