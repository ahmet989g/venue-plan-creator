'use client'

// Reusable toggle buton grubu
// Tekli seçim (radio davranışı) veya çoklu seçim (checkbox davranışı) modları
// Row labeling Position (L/R) ve Seat labeling Direction için kullanılır
// Aktif butonlar accent rengi alır

export interface ToggleOption<T extends string = string> {
  value: T
  label: string
  // İsteğe bağlı ikon — label ile birlikte veya yerine
  icon?: React.ReactNode
}

interface ToggleButtonGroupProps<T extends string = string> {
  options: ToggleOption<T>[]
  // Tekli seçim modu
  value?: T | null
  onChange?: (value: T) => void
  // Çoklu seçim modu (Position L/R gibi — ikisi birden aktif olabilir)
  values?: T[]
  onChangeMulti?: (values: T[]) => void
  // Deaktif edilebilir mi — aktife tekrar tıklayınca kaldırır
  deselectable?: boolean
}

export default function ToggleButtonGroup<T extends string = string>({
  options,
  value,
  onChange,
  values,
  onChangeMulti,
  deselectable = true,
}: ToggleButtonGroupProps<T>) {
  const isMulti = values !== undefined && onChangeMulti !== undefined

  const isActive = (optValue: T): boolean => {
    if (isMulti) return values!.includes(optValue)
    return value === optValue
  }

  const handleClick = (optValue: T) => {
    if (isMulti) {
      const current = values!
      const next = current.includes(optValue)
        ? current.filter((v) => v !== optValue)   // Aktifse çıkar
        : [...current, optValue]                  // Değilse ekle
      onChangeMulti!(next)
    } else {
      // Tekli mod — deselectable ise aktife tıklayınca null yap
      if (deselectable && value === optValue) {
        onChange?.('' as T)  // Boş string = seçim yok
      } else {
        onChange?.(optValue)
      }
    }
  }

  return (
    <div className="flex items-center gap-0.5 p-0.5 rounded-md bg-[var(--color-surface)] border border-[var(--color-border)]">
      {options.map((option) => {
        const active = isActive(option.value)
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => handleClick(option.value)}
            className={[
              'flex items-center justify-center gap-1',
              'h-6 min-w-[28px] px-2 rounded',
              'text-xs font-medium',
              'transition-colors duration-100 select-none cursor-pointer border-none',
              active
                ? 'bg-[var(--color-accent)] text-white'
                : 'bg-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)]',
            ].join(' ')}
            aria-pressed={active}
          >
            {option.icon}
            {option.label && <span>{option.label}</span>}
          </button>
        )
      })}
    </div>
  )
}