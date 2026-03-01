'use client'

// Reusable dropdown / select bileşeni
// Portal sorunu: dropdown body'e mount edilir, containerRef.contains() onu bulamaz
// Çözüm: dropdownRef ile portal elementini de outside-click kontrolüne dahil et

import { useState, useRef, useEffect, useCallback, useId } from 'react'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import { createPortal } from 'react-dom'

export interface SelectOption<T extends string = string> {
  value: T
  label: string
  color?: string
  icon?: React.ReactNode
}

export interface SelectBoxProps<T extends string = string> {
  value: T | null
  onChange: (value: T) => void
  options: SelectOption<T>[]
  placeholder?: string
  fullWidth?: boolean
  disabled?: boolean
  modified?: boolean
}

export default function SelectBox<T extends string = string>({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  fullWidth = false,
  disabled = false,
  modified = false,
}: SelectBoxProps<T>) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLUListElement>(null)  // Portal içindeki liste
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({})
  const id = useId()

  const selected = options.find((o) => o.value === value) ?? null

  const openDropdown = useCallback(() => {
    if (disabled) return
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    setDropdownStyle({
      position: 'fixed',
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
      zIndex: 9999,
    })
    setIsOpen(true)
  }, [disabled])

  // Outside-click: hem trigger hem portal elementini kontrol et
  useEffect(() => {
    if (!isOpen) return

    const handle = (e: MouseEvent) => {
      const target = e.target as Node
      const inTrigger = containerRef.current?.contains(target)
      const inDropdown = dropdownRef.current?.contains(target)
      if (!inTrigger && !inDropdown) setIsOpen(false)
    }

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }

    // mousedown yerine click — option click'i engelleme
    document.addEventListener('click', handle)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('click', handle)
      document.removeEventListener('keydown', handleKey)
    }
  }, [isOpen])

  const handleSelect = useCallback(
    (option: SelectOption<T>) => {
      onChange(option.value)
      setIsOpen(false)
    },
    [onChange],
  )

  const toggleClass = [
    'flex items-center justify-between gap-1 h-7 px-2 rounded-md',
    'border bg-[var(--color-surface)]',
    'text-xs cursor-pointer select-none',
    'transition-colors duration-100',
    'hover:bg-[var(--color-surface-2)]',
    disabled ? 'opacity-50 cursor-not-allowed' : '',
    isOpen ? 'border-[var(--color-accent)]' : 'border-[var(--color-border)]',
    modified ? 'text-[var(--color-accent)]' : 'text-[var(--color-text)]',
    fullWidth ? 'w-full' : 'w-[160px]',
  ].filter(Boolean).join(' ')

  return (
    <div ref={containerRef} className={fullWidth ? 'w-full' : 'w-[160px]'}>
      <button
        id={id}
        type="button"
        className={toggleClass}
        onClick={() => (isOpen ? setIsOpen(false) : openDropdown())}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        {selected ? (
          <span className="flex items-center gap-1.5 truncate">
            {selected.color && (
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: selected.color }}
              />
            )}
            {selected.icon}
            <span className="truncate">{selected.label}</span>
          </span>
        ) : (
          <span className="text-[var(--color-text-muted)] truncate">{placeholder}</span>
        )}
        {isOpen
          ? <ExpandLessIcon sx={{ fontSize: 14, flexShrink: 0 }} />
          : <ExpandMoreIcon sx={{ fontSize: 14, flexShrink: 0 }} />
        }
      </button>

      {isOpen && typeof document !== 'undefined' && createPortal(
        <ul
          ref={dropdownRef}
          style={dropdownStyle}
          role="listbox"
          className="
            rounded-md border border-[var(--color-border)]
            bg-[var(--color-surface)] shadow-lg
            py-1 overflow-y-auto max-h-52
          "
        >
          {options.map((option) => (
            <li
              key={option.value}
              role="option"
              aria-selected={option.value === value}
              onClick={() => handleSelect(option)}
              className={[
                'flex items-center gap-2 px-2.5 py-1.5 text-xs cursor-pointer',
                'transition-colors duration-75',
                option.value === value
                  ? 'bg-[var(--color-accent)] text-white'
                  : 'text-[var(--color-text)] hover:bg-[var(--color-surface-2)]',
              ].join(' ')}
            >
              {option.color && (
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: option.color }}
                />
              )}
              {option.icon}
              {option.label}
            </li>
          ))}
        </ul>,
        document.body,
      )}
    </div>
  )
}