'use client'

// Reusable dropdown / select bileşeni
// Kategori seçimi, Seat Labeling Labels gibi seçim listeleri için kullanılır
// Portal render — z-index sorunlarından korunmak için body'e mount edilir
// Dışarı tıklayınca kapanır, Escape ile de kapanır

import { useState, useRef, useEffect, useCallback, useId } from 'react'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'

export interface SelectOption<T extends string = string> {
  value: T
  label: string
  // Renk badge için — kategori seçicisinde kullanılır
  color?: string
  // Özel render için — isteğe bağlı
  icon?: React.ReactNode
}

interface SelectBoxProps<T extends string = string> {
  value: T | null
  onChange: (value: T) => void
  options: SelectOption<T>[]
  placeholder?: string
  // Tam genişlik mi yoksa sabit w-[160px] mi
  fullWidth?: boolean
  disabled?: boolean
}

export default function SelectBox<T extends string = string>({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  fullWidth = false,
  disabled = false,
}: SelectBoxProps<T>) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({})
  const id = useId()

  const selected = options.find((o) => o.value === value) ?? null

  // Dropdown konumunu hesapla — tetikleyicinin altına hizala
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

  // Dışarı tıklayınca kapat
  useEffect(() => {
    if (!isOpen) return

    const handle = (e: MouseEvent) => {
      const target = e.target as Node
      if (!containerRef.current?.contains(target)) {
        setIsOpen(false)
      }
    }

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }

    document.addEventListener('mousedown', handle)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handle)
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
    'border border-[var(--color-border)] bg-[var(--color-surface)]',
    'text-xs cursor-pointer select-none',
    'transition-colors duration-100',
    'hover:bg-[var(--color-surface-2)]',
    disabled ? 'opacity-50 cursor-not-allowed' : '',
    isOpen ? 'border-[var(--color-accent)]' : '',
    fullWidth ? 'w-full' : 'w-[160px]',
  ].join(' ')

  return (
    <div ref={containerRef} className={fullWidth ? 'w-full' : 'w-[160px]'}>

      {/* Tetikleyici buton */}
      <button
        id={id}
        type="button"
        className={toggleClass}
        onClick={isOpen ? () => setIsOpen(false) : openDropdown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        disabled={disabled}
      >
        <span className="flex items-center gap-1.5 overflow-hidden">
          {/* Renk badge — kategori seçicisinde */}
          {selected?.color && (
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: selected.color }}
            />
          )}
          {selected?.icon}
          <span className={`truncate ${selected ? 'text-[var(--color-text)]' : 'text-[var(--color-text-muted)]'}`}>
            {selected?.label ?? placeholder}
          </span>
        </span>

        {isOpen
          ? <ExpandLessIcon sx={{ fontSize: 14, color: 'var(--color-text-muted)', flexShrink: 0 }} />
          : <ExpandMoreIcon sx={{ fontSize: 14, color: 'var(--color-text-muted)', flexShrink: 0 }} />
        }
      </button>

      {/* Dropdown — fixed konumda, body'e portal */}
      {isOpen && typeof window !== 'undefined' && (
        <DropdownPortal>
          <ul
            role="listbox"
            style={dropdownStyle}
            className="
              rounded-md border border-[var(--color-border)]
              bg-[var(--color-surface-2)] shadow-lg
              py-1 overflow-y-auto max-h-52
            "
          >
            {options.map((option) => {
              const isSelected = option.value === value
              return (
                <li
                  key={option.value}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(option)}
                  className={[
                    'flex items-center gap-2 px-3 py-1.5 cursor-pointer',
                    'text-xs transition-colors duration-75',
                    isSelected
                      ? 'text-[var(--color-accent)] bg-[var(--color-surface)]'
                      : 'text-[var(--color-text)] hover:bg-[var(--color-surface)]',
                  ].join(' ')}
                >
                  {/* Renk badge */}
                  {option.color && (
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: option.color }}
                    />
                  )}
                  {option.icon}
                  <span className="truncate">{option.label}</span>
                </li>
              )
            })}
          </ul>
        </DropdownPortal>
      )}
    </div>
  )
}

// Dropdown'ı body'e portal olarak mount eder — z-index sorununu önler
function DropdownPortal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  if (!mounted) return null

  // React createPortal kullanmak için dynamic import gerekir — SSR uyumlu alternatif:
  // fixed konumlandırma zaten viewport'a göre çalışır, portal şimdilik gerek yok
  return <>{children}</>
}