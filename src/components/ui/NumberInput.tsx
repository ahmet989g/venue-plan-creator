'use client'

// Reusable sayı input bileşeni
// < value unit > tasarımı — ok butonlarıyla veya tıklayıp yazarak değer değiştirme
// Basılı tutunca hızlı değişim: ilk 500ms bekler, sonra 60ms aralıkla tekrarlar

import { useState, useRef, useCallback, useEffect } from 'react'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'

const HOLD_INITIAL_MS = 500
const HOLD_REPEAT_MS = 60

interface NumberInputProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  unit?: string
  modified?: boolean   // Default'tan farklıysa accent rengiyle vurgula
}

export default function NumberInput({
  value,
  onChange,
  min = 1,
  max = 999,
  step = 1,
  unit = 'pt',
  modified = false,
}: NumberInputProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [inputValue, setInputValue] = useState(String(value))

  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const repeatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const clamp = useCallback(
    (v: number) => Math.min(max, Math.max(min, v)),
    [min, max],
  )

  const clearHold = useCallback(() => {
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current)
    if (repeatTimerRef.current) clearInterval(repeatTimerRef.current)
    holdTimerRef.current = null
    repeatTimerRef.current = null
  }, [])

  const startHold = useCallback((action: () => void) => {
    action()
    holdTimerRef.current = setTimeout(() => {
      repeatTimerRef.current = setInterval(action, HOLD_REPEAT_MS)
    }, HOLD_INITIAL_MS)
  }, [])

  // Unmount'ta timer'ları temizle
  useEffect(() => () => clearHold(), [clearHold])

  // Dışarıdan gelen value değişince input'u güncelle
  useEffect(() => {
    if (!isEditing) setInputValue(String(value))
  }, [value, isEditing])

  const increment = useCallback(
    () => onChange(clamp(value + step)),
    [value, step, onChange, clamp],
  )

  const decrement = useCallback(
    () => onChange(clamp(value - step)),
    [value, step, onChange, clamp],
  )

  const commitEdit = useCallback(() => {
    const parsed = parseFloat(inputValue)
    if (!isNaN(parsed)) onChange(clamp(parsed))
    else setInputValue(String(value))
    setIsEditing(false)
  }, [inputValue, value, onChange, clamp])

  const arrowClass = [
    'flex items-center justify-center w-6 h-full shrink-0',
    'text-[var(--color-text-muted)]',
    'hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)]',
    'active:bg-[var(--color-border)]',
    'transition-colors duration-100',
    'select-none',
  ].join(' ')

  return (
    <div className="flex items-center h-7 w-[104px] rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">

      {/* Sol ok — basılı tutunca azalt */}
      <button
        className={arrowClass}
        onMouseDown={(e) => { e.preventDefault(); startHold(decrement) }}
        onMouseUp={clearHold}
        onMouseLeave={clearHold}
        tabIndex={-1}
        aria-label="Azalt"
      >
        <ChevronLeftIcon sx={{ fontSize: 14 }} />
      </button>

      {/* Değer alanı — tıklayınca yazılabilir */}
      {isEditing ? (
        <input
          className="flex-1 h-full text-center text-xs bg-transparent text-[var(--color-text)] outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          type="number"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitEdit()
            if (e.key === 'Escape') { setInputValue(String(value)); setIsEditing(false) }
          }}
          autoFocus
        />
      ) : (
        <button
          className="flex flex-1 items-center justify-center gap-1 h-full cursor-text select-none"
          onClick={() => { setIsEditing(true); setInputValue(String(value)) }}
          tabIndex={-1}
        >
          <span className={`text-xs font-medium tabular-nums ${modified
              ? 'text-[var(--color-accent)]'
              : 'text-[var(--color-text)]'
            }`}>
            {value}
          </span>
          <span className="text-[11px] text-[var(--color-text-muted)]">{unit}</span>
        </button>
      )}

      {/* Sağ ok — basılı tutunca artır */}
      <button
        className={arrowClass}
        onMouseDown={(e) => { e.preventDefault(); startHold(increment) }}
        onMouseUp={clearHold}
        onMouseLeave={clearHold}
        tabIndex={-1}
        aria-label="Artır"
      >
        <ChevronRightIcon sx={{ fontSize: 14 }} />
      </button>

    </div>
  )
}