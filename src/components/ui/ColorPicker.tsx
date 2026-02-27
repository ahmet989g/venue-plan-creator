'use client'

// Reusable renk seçici bileşeni
// 12 colorblind-safe preset renk + özel hex input
// Seçili renk üzerinde beyaz checkmark gösterilir
// Doğrudan inline render — dropdown değil, parent container içine yerleşir

import { useState, useCallback, useId } from 'react'
import CheckIcon from '@mui/icons-material/Check'
import { CATEGORY_PRESET_COLORS } from '@/lib/constants'

interface ColorPickerProps {
  value: string          // Seçili hex renk — '#rrggbb' formatında
  onChange: (color: string) => void
}

// Hex rengin okunabilir olup olmadığını belirler — checkmark rengi için
function isLightColor(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  // Luminance formülü (WCAG)
  return (r * 299 + g * 587 + b * 114) / 1000 > 128
}

// Girilen hex değerini normalize et — 6 haneli tam hex döndür veya null
function normalizeHex(input: string): string | null {
  const clean = input.startsWith('#') ? input : `#${input}`
  if (/^#[0-9a-fA-F]{6}$/.test(clean)) return clean.toLowerCase()
  if (/^#[0-9a-fA-F]{3}$/.test(clean)) {
    const [, r, g, b] = clean.split('')
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase()
  }
  return null
}

export default function ColorPicker({ value, onChange }: ColorPickerProps) {
  const hexInputId = useId()
  // Input alanı için ayrı state — kullanıcı yazarken normalize etmez
  const [hexInput, setHexInput] = useState(value)

  const handlePresetClick = useCallback(
    (color: string) => {
      onChange(color)
      setHexInput(color)
    },
    [onChange],
  )

  const handleHexChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value
      setHexInput(raw)

      const normalized = normalizeHex(raw)
      if (normalized) onChange(normalized)
    },
    [onChange],
  )

  const handleHexBlur = useCallback(() => {
    // Blur'da geçersizse mevcut değere dön
    const normalized = normalizeHex(hexInput)
    if (normalized) {
      setHexInput(normalized)
    } else {
      setHexInput(value)
    }
  }, [hexInput, value])

  return (
    <div className="flex flex-col gap-3">

      {/* Preset renk ızgarası — 6 sütun × 2 satır */}
      <div className="grid grid-cols-6 gap-1.5">
        {CATEGORY_PRESET_COLORS.map((color) => {
          const isSelected = color === value
          const light = isLightColor(color)

          return (
            <button
              key={color}
              type="button"
              title={color}
              onClick={() => handlePresetClick(color)}
              className="
                w-7 h-7 rounded-md border-2 cursor-pointer
                flex items-center justify-center
                transition-transform duration-100 hover:scale-110
              "
              style={{
                backgroundColor: color,
                borderColor: isSelected ? 'var(--color-text)' : 'transparent',
              }}
              aria-pressed={isSelected}
              aria-label={`Renk: ${color}`}
            >
              {isSelected && (
                <CheckIcon
                  sx={{
                    fontSize: 14,
                    color: light ? '#1f2328' : '#ffffff',
                  }}
                />
              )}
            </button>
          )
        })}
      </div>

      {/* Custom hex input */}
      <div className="flex items-center gap-2">
        {/* Anlık renk önizleme */}
        <div
          className="w-7 h-7 rounded-md border border-[var(--color-border)] shrink-0"
          style={{ backgroundColor: value }}
        />

        <div className="flex items-center flex-1 h-7 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden px-2 gap-1.5">
          <label
            htmlFor={hexInputId}
            className="text-[11px] text-[var(--color-text-muted)] shrink-0 select-none"
          >
            HEX
          </label>
          <input
            id={hexInputId}
            type="text"
            value={hexInput}
            onChange={handleHexChange}
            onBlur={handleHexBlur}
            maxLength={7}
            placeholder="#000000"
            className="
              flex-1 h-full bg-transparent text-xs text-[var(--color-text)]
              outline-none placeholder:text-[var(--color-text-muted)]
              uppercase
            "
            spellCheck={false}
          />
        </div>
      </div>

    </div>
  )
}