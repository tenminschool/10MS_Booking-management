import React, { useState } from 'react'
import { Check, ChevronDown, X, Users, User, Shield, GraduationCap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export interface Option {
  value: string
  label: string
  type: 'individual' | 'group'
  group?: string
  user?: {
    id: string
    name: string
    role: string
    branch?: { name: string }
  }
  count?: number
}

interface MultiSelectComboboxProps {
  options: Option[]
  value: string[]
  onChange: (values: string[]) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export const MultiSelectCombobox: React.FC<MultiSelectComboboxProps> = ({
  options,
  value,
  onChange,
  placeholder = "Select options...",
  className = "",
  disabled = false
}) => {
  const [open, setOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  // Filter options based on search term
  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Group options by type
  const groupedOptions = filteredOptions.reduce((acc, option) => {
    if (option.type === 'group') {
      if (!acc.groups) acc.groups = []
      acc.groups.push(option)
    } else {
      if (!acc.individuals) acc.individuals = []
      acc.individuals.push(option)
    }
    return acc
  }, {} as { groups?: Option[]; individuals?: Option[] })

  const selectedOptions = options.filter(option => value.includes(option.value))

  const handleToggle = (optionValue: string) => {
    if (value.includes(optionValue)) {
      onChange(value.filter(v => v !== optionValue))
    } else {
      onChange([...value, optionValue])
    }
  }

  const handleRemove = (optionValue: string) => {
    onChange(value.filter(v => v !== optionValue))
  }

  const getIcon = (option: Option) => {
    if (option.type === 'group') {
      if (option.label.includes('Students')) return <GraduationCap className="w-4 h-4" />
      if (option.label.includes('Teachers')) return <Users className="w-4 h-4" />
      if (option.label.includes('Admins')) return <Shield className="w-4 h-4" />
      return <Users className="w-4 h-4" />
    }
    return <User className="w-4 h-4" />
  }

  return (
    <div className={cn("relative", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "w-full justify-between min-h-[40px] h-auto",
              selectedOptions.length === 0 && "text-muted-foreground"
            )}
            disabled={disabled}
          >
            <div className="flex flex-wrap gap-1 items-center">
              {selectedOptions.length === 0 ? (
                <span>{placeholder}</span>
              ) : (
                selectedOptions.map(option => (
                  <Badge
                    key={option.value}
                    variant="secondary"
                    className="mr-1 mb-1 px-2 py-1 text-xs"
                  >
                    <div className="flex items-center gap-1">
                      {getIcon(option)}
                      <span className="truncate max-w-[120px]">{option.label}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRemove(option.value)
                        }}
                        className="ml-1 hover:bg-secondary-foreground/20 rounded-full p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </Badge>
                ))
              )}
            </div>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700" align="start">
          <Command>
            <CommandInput
              placeholder="Search users or groups..."
              value={searchTerm}
              onValueChange={setSearchTerm}
            />
            <CommandList className="max-h-64">
              <CommandEmpty>No options found.</CommandEmpty>
              
              {/* Groups */}
              {groupedOptions.groups && groupedOptions.groups.length > 0 && (
                <CommandGroup heading="GROUPS">
                  {groupedOptions.groups.map(option => (
                    <CommandItem
                      key={option.value}
                      value={option.value}
                      onSelect={() => handleToggle(option.value)}
                      className="flex items-center gap-2"
                    >
                      <div className={cn(
                        "flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                        value.includes(option.value) 
                          ? "bg-primary text-primary-foreground" 
                          : "opacity-50 [&_svg]:invisible"
                      )}>
                        <Check className="h-3 w-3" />
                      </div>
                      <div className="flex items-center gap-2 flex-1">
                        {getIcon(option)}
                        <span className="flex-1">{option.label}</span>
                        {option.count && (
                          <Badge variant="outline" className="text-xs">
                            {option.count}
                          </Badge>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {/* Individuals */}
              {groupedOptions.individuals && groupedOptions.individuals.length > 0 && (
                <CommandGroup heading="INDIVIDUAL USERS">
                  {groupedOptions.individuals.map(option => (
                    <CommandItem
                      key={option.value}
                      value={option.value}
                      onSelect={() => handleToggle(option.value)}
                      className="flex items-center gap-2"
                    >
                      <div className={cn(
                        "flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                        value.includes(option.value) 
                          ? "bg-primary text-primary-foreground" 
                          : "opacity-50 [&_svg]:invisible"
                      )}>
                        <Check className="h-3 w-3" />
                      </div>
                      <div className="flex items-center gap-2 flex-1">
                        {getIcon(option)}
                        <span className="flex-1">{option.label}</span>
                        {option.user?.branch && (
                          <Badge variant="outline" className="text-xs">
                            {option.user.branch.name}
                          </Badge>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}