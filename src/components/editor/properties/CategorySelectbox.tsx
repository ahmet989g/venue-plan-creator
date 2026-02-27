'use client'

// Kategori seçici — tekli veya çoklu row seçiminde çalışır
// Hedef koltuklar: selectedSeatIds doluysa o koltuklar, boşsa rows'taki tüm koltuklar
// Durum hesabı: full = tüm hedef koltuklar o kategoride, partial = bir kısım, none = hiç

import { useMemo, useCallback } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useEditorStore } from '@/store/editor.store'
import type { Category, Row } from '@/store/types'

interface CategorySelectboxProps {
  rows: Row[]   // Tekli seçimde [row], çoklu seçimde [row1, row2, ...]
}

export default function CategorySelectbox({ rows }: CategorySelectboxProps) {
  const { categories, selectedSeatIds, assignCategoryToSeats } = useEditorStore(
    useShallow((s) => ({
      categories: s.chart?.categories ?? [],
      selectedSeatIds: s.selectedSeatIds,
      assignCategoryToSeats: s.assignCategoryToSeats,
    })),
  )

  // Tüm rowlardaki koltuk ID seti
  const allRowSeatIds = useMemo(
    () => new Set(rows.flatMap((r) => r.seats.map((s) => s.id))),
    [rows],
  )

  // Hedef koltuk ID'leri:
  // - Belirli koltuklar seçiliyse → bu rowlara ait olanlar
  // - Seçim yoksa → tüm rowların tüm koltukları
  const targetSeatIds = useMemo(() => {
    if (selectedSeatIds.length === 0) return [...allRowSeatIds]
    return selectedSeatIds.filter((id) => allRowSeatIds.has(id))
  }, [selectedSeatIds, allRowSeatIds])

  // Tüm hedef koltuk nesnelerini topla
  const targetSeats = useMemo(() => {
    const idSet = new Set(targetSeatIds)
    return rows.flatMap((r) => r.seats.filter((s) => idSet.has(s.id)))
  }, [rows, targetSeatIds])

  // Her kategori için durum: full / partial / none
  const categoryStatus = useMemo((): Map<string, 'full' | 'partial' | 'none'> => {
    const map = new Map<string, 'full' | 'partial' | 'none'>()
    if (targetSeats.length === 0) return map

    for (const cat of categories) {
      const matchCount = targetSeats.filter((s) => s.categoryIds.includes(cat.id)).length
      if (matchCount === 0) map.set(cat.id, 'none')
      else if (matchCount === targetSeats.length) map.set(cat.id, 'full')
      else map.set(cat.id, 'partial')
    }

    return map
  }, [targetSeats, categories])

  const handleCategoryClick = useCallback(
    (categoryId: string) => {
      if (targetSeatIds.length === 0) return
      const status = categoryStatus.get(categoryId)
      assignCategoryToSeats(targetSeatIds, categoryId, status === 'full')
    },
    [targetSeatIds, categoryStatus, assignCategoryToSeats],
  )

  // Toplam koltuk sayısı
  const totalSeats = rows.reduce((sum, r) => sum + r.seats.length, 0)

  if (categories.length === 0) {
    return (
      <p className="text-xs text-[var(--color-text-muted)] italic py-1">
        No categories defined.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-1">

      {/* Hedef bilgisi */}
      <p className="text-[10px] text-[var(--color-text-muted)] mb-0.5">
        {selectedSeatIds.length > 0
          ? `${targetSeatIds.length} seat${targetSeatIds.length !== 1 ? 's' : ''} selected`
          : rows.length > 1
            ? `All seats in ${rows.length} rows (${totalSeats})`
            : `All ${totalSeats} seats`}
      </p>

      <div className="flex flex-col gap-0.5">
        {categories.map((category) => {
          const status = categoryStatus.get(category.id) ?? 'none'
          const isActive = status === 'full'
          const isPartial = status === 'partial'

          return (
            <CategoryOption
              key={category.id}
              category={category}
              isActive={isActive}
              isPartial={isPartial}
              onClick={() => handleCategoryClick(category.id)}
            />
          )
        })}
      </div>

    </div>
  )
}

// --- Tekil kategori satırı ---

interface CategoryOptionProps {
  category: Category
  isActive: boolean
  isPartial: boolean
  onClick: () => void
}

function CategoryOption({ category, isActive, isPartial, onClick }: CategoryOptionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-left',
        'text-xs transition-colors duration-100 cursor-pointer border-none',
        isActive
          ? 'bg-[var(--color-surface-2)] text-[var(--color-text)]'
          : 'bg-transparent text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]',
      ].join(' ')}
      aria-pressed={isActive}
    >
      <span
        className="w-3 h-3 rounded-full shrink-0 border border-black/10"
        style={{ backgroundColor: category.color }}
      />
      <span className="flex-1 truncate">{category.label}</span>
      {category.isWheelchair && (
        <span className="text-[10px] text-[var(--color-text-muted)] shrink-0">♿</span>
      )}
      <span className="shrink-0 w-3.5 h-3.5 flex items-center justify-center">
        {isActive && (
          <svg viewBox="0 0 12 12" className="w-3 h-3" fill="none">
            <circle cx="6" cy="6" r="5.5" fill="var(--color-accent)" />
            <path d="M3.5 6l1.8 1.8 3.2-3.6" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
        {isPartial && (
          <svg viewBox="0 0 12 12" className="w-3 h-3" fill="none">
            <circle cx="6" cy="6" r="5.5" stroke="var(--color-accent)" strokeWidth="1.5" />
            <path d="M3.5 6h5" stroke="var(--color-accent)" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        )}
      </span>
    </button>
  )
}