import React, { useRef, useContext } from 'react'
import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CommandProps {
  children: React.ReactNode
  className?: string
}

interface CommandInputProps {
  placeholder?: string
  value?: string
  onValueChange?: (value: string) => void
  className?: string
}

interface CommandListProps {
  children: React.ReactNode
  className?: string
}

interface CommandEmptyProps {
  children: React.ReactNode
}

interface CommandGroupProps {
  children: React.ReactNode
  heading?: string
  className?: string
}

interface CommandItemProps {
  children: React.ReactNode
  value?: string
  onSelect?: () => void
  className?: string
}

const CommandContext = React.createContext<{
  searchValue: string
  setSearchValue: (value: string) => void
}>({
  searchValue: '',
  setSearchValue: () => {}
})

const Command: React.FC<CommandProps> = ({ children, className }) => {
  return (
    <div className={cn(
      "flex h-full w-full flex-col overflow-hidden rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100",
      className
    )}>
      {children}
    </div>
  )
}

const CommandInput: React.FC<CommandInputProps> = ({ 
  placeholder = "Search...", 
  value, 
  onValueChange,
  className 
}) => {
  const { searchValue, setSearchValue } = useContext(CommandContext)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setSearchValue(newValue)
    onValueChange?.(newValue)
  }

  return (
    <div className={cn("flex items-center border-b px-3", className)}>
      <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
      <input
        ref={inputRef}
        placeholder={placeholder}
        value={value ?? searchValue}
        onChange={handleChange}
        className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-gray-500 dark:placeholder:text-gray-400 disabled:cursor-not-allowed disabled:opacity-50"
      />
    </div>
  )
}

const CommandList: React.FC<CommandListProps> = ({ children, className }) => {
  return (
    <div className={cn("max-h-64 overflow-auto", className)}>
      {children}
    </div>
  )
}

const CommandEmpty: React.FC<CommandEmptyProps> = ({ children }) => {
  const { searchValue } = useContext(CommandContext)
  
  if (searchValue) {
    return (
      <div className="py-6 text-center text-sm">
        {children}
      </div>
    )
  }
  
  return null
}

const CommandGroup: React.FC<CommandGroupProps> = ({ children, heading, className }) => {
  return (
    <div className={cn("p-1", className)}>
      {heading && (
        <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400">
          {heading}
        </div>
      )}
      <div className="space-y-1">
        {children}
      </div>
    </div>
  )
}

const CommandItem: React.FC<CommandItemProps> = ({
  children,
  onSelect,
  className
}) => {

  return (
    <div
      className={cn(
        "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none aria-selected:bg-gray-100 dark:aria-selected:bg-gray-700 aria-selected:text-gray-900 dark:aria-selected:text-gray-100 data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className
      )}
      onClick={onSelect}
    >
      {children}
    </div>
  )
}

const CommandSeparator: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn("-mx-1 h-px bg-gray-200 dark:bg-gray-700", className)} />
)

export {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator
}