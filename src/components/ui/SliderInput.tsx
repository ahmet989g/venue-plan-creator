'use client'

// Reusable slider input bileşeni
// Curve (-100..100), opacity, benzeri sayısal aralıklar için kullanılır
// Tasarım: mevcut değer label (sağ üst) + altında track + thumb
// modified prop: varsayılandan farklıysa accent rengi vurgular

import { useCallback, useId } from 'react'

interface SliderInputProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  modified?: boolean   // Varsayılandan farklıysa accent vurgusu
  showTicks?: boolean  // Min/0/Max göstergesi
}

export default function SliderInput({
  value,
  onChange,
  min = -100,
  max = 100,
  step = 1,
  modified = false,
  showTicks = true,
}: SliderInputProps) {
  const id = useId()

  // 0..1 arası yüzde — thumb pozisyonu ve track dolgu için
  const percent = ((value - min) / (max - min)) * 100

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(Number(e.target.value))
    },
    [onChange],
  )

  const accentColor = modified
    ? 'var(--color-accent)'
    : 'var(--color-accent)'   // Slider thumb her zaman accent

  const valueLabel = value === 0 ? '0' : value > 0 ? `+${value}` : String(value)

  return (
    <div className="flex flex-col gap-1 w-full">

      {/* Üst satır: başlık değil — sadece anlık değer sağda */}
      <div className="flex items-center justify-end">
        <span className={`text-xs tabular-nums font-medium ${modified ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-muted)]'
          }`}>
          {valueLabel}
        </span>
      </div>

      {/* Slider track */}
      <div className="relative w-full">
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleChange}
          className="w-full h-1.5 appearance-none rounded-full cursor-pointer outline-none
            bg-[var(--color-border)]
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-4
            [&::-webkit-slider-thumb]:h-4
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-[var(--color-accent)]
            [&::-webkit-slider-thumb]:border-2
            [&::-webkit-slider-thumb]:border-[var(--color-surface)]
            [&::-webkit-slider-thumb]:shadow-sm
            [&::-webkit-slider-thumb]:transition-transform
            [&::-webkit-slider-thumb]:duration-100
            [&::-webkit-slider-thumb]:hover:scale-110
            [&::-moz-range-thumb]:w-4
            [&::-moz-range-thumb]:h-4
            [&::-moz-range-thumb]:rounded-full
            [&::-moz-range-thumb]:bg-[var(--color-accent)]
            [&::-moz-range-thumb]:border-2
            [&::-moz-range-thumb]:border-[var(--color-surface)]
            [&::-moz-range-thumb]:cursor-pointer"
          style={{
            // Track'in sol kısmını accent renginde doldur
            background: `linear-gradient(
              to right,
              ${accentColor} 0%,
              ${accentColor} ${percent}%,
              var(--color-border) ${percent}%,
              var(--color-border) 100%
            )`,
          }}
        />
      </div>

      {/* Alt etiketler — min / orta / max */}
      {showTicks && (
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-[var(--color-text-muted)] tabular-nums">{min}</span>
          {/* Orta referans noktası — simetrik slider'larda (örn: -100..100) 0'ı gösterir */}
          {min < 0 && max > 0 && (
            <span className="text-[10px] text-[var(--color-text-muted)]">0°</span>
          )}
          <span className="text-[10px] text-[var(--color-text-muted)] tabular-nums">{max}°</span>
        </div>
      )}
    </div>
  )
}