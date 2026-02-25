'use client'

// Category Manage Panel — tek kategori satırı
// Drag handle, wheelchair ikonu, renk seçici, isim inputu ve silme ikonundan oluşur.
// useSortable hook'u ile dnd-kit'e entegre çalışır.

import { useRef, useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Category } from '@/store/types'

interface CategoryItemProps {
  category: Category
  onUpdate: (patch: Partial<Omit<Category, 'id'>>) => void
  onDelete: () => void
}

// Tasarım sistemindeki kategorilere uygun hazır renk paleti
const COLOR_PALETTE = [
  '#E63946', '#F4A261', '#E9C46A',
  '#2A9D8F', '#457B9D', '#6A4C93',
  '#8D99AE', '#A8DADC', '#CDB4DB',
  '#264653', '#E76F51', '#52B788',
]

export function CategoryItem({ category, onUpdate, onDelete }: CategoryItemProps) {
  const [showPicker, setShowPicker] = useState(false)
  const colorRef = useRef<HTMLDivElement>(null)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: category.id,
  })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        flex items-center gap-2 px-2 py-1.5 rounded-md
        hover:bg-[var(--color-surface-2)]
        ${isDragging ? 'z-50' : ''}
      `}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-[var(--color-text-muted)] hover:text-[var(--color-text)] flex-shrink-0"
        tabIndex={-1}
        aria-label="Sıralamak için sürükle"
      >
        {/* Hamburger handle ikonu */}
        <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
          <rect y="2" width="14" height="1.5" rx="1" />
          <rect y="6" width="14" height="1.5" rx="1" />
          <rect y="10" width="14" height="1.5" rx="1" />
        </svg>
      </button>

      {/* Wheelchair toggle */}
      <button
        onClick={() => onUpdate({ isWheelchair: !category.isWheelchair })}
        title={category.isWheelchair ? 'Tekerlekli sandalye kategorisi' : 'Normal kategori'}
        className={`
          flex-shrink-0 w-5 h-5 rounded transition-colors
          ${category.isWheelchair
            ? 'text-[var(--color-accent)]'
            : 'text-[var(--color-text-muted)] opacity-40 hover:opacity-70'
          }
        `}
      >
        {/* Tekerlekli sandalye ikonu */}
        <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
          <path d="M12 2a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm-1 5h-1a1 1 0 0 0 0 2h1v3.382l-2.447 4.894A1 1 0 0 0 9.447 19H15a1 1 0 0 0 .894-1.447L13 12.382V9h1a1 1 0 0 0 0-2h-3zm-3 12a4 4 0 1 0 8 0" />
        </svg>
      </button>

      {/* Renk seçici */}
      <div className="relative flex-shrink-0" ref={colorRef}>
        <button
          onClick={() => setShowPicker((v) => !v)}
          className="w-5 h-5 rounded-full border-2 border-[var(--color-border)] hover:scale-110 transition-transform"
          style={{ backgroundColor: category.color }}
          aria-label="Renk seç"
        />
        {showPicker && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowPicker(false)}
            />
            <div className="absolute left-6 top-0 z-50 p-2 rounded-lg shadow-xl border border-[var(--color-border)] bg-[var(--color-surface)] grid grid-cols-4 gap-1.5">
              {COLOR_PALETTE.map((color) => (
                <button
                  key={color}
                  onClick={() => { onUpdate({ color }); setShowPicker(false) }}
                  className={`
                    w-6 h-6 rounded-full border-2 transition-transform hover:scale-110
                    ${category.color === color
                      ? 'border-white scale-110'
                      : 'border-transparent'
                    }
                  `}
                  style={{ backgroundColor: color }}
                  aria-label={color}
                />
              ))}

              {/* Native color input — özel renk */}
              <label
                className="w-6 h-6 rounded-full border-2 border-dashed border-[var(--color-text-muted)] flex items-center justify-center cursor-pointer hover:scale-110 transition-transform"
                title="Özel renk"
              >
                <span className="text-[var(--color-text-muted)] text-xs leading-none">+</span>
                <input
                  type="color"
                  value={category.color}
                  onChange={(e) => onUpdate({ color: e.target.value })}
                  className="sr-only"
                />
              </label>
            </div>
          </>
        )}
      </div>

      {/* Kategori adı */}
      <input
        type="text"
        value={category.label}
        onChange={(e) => onUpdate({ label: e.target.value })}
        className="
          flex-1 min-w-0 bg-transparent text-sm text-[var(--color-text)]
          border-b border-transparent hover:border-[var(--color-border)]
          focus:border-[var(--color-accent)] focus:outline-none
          transition-colors py-0.5
        "
        placeholder="Kategori adı"
      />

      {/* Sil */}
      <button
        onClick={onDelete}
        title="Kategoriyi sil"
        className="flex-shrink-0 text-[var(--color-text-muted)] hover:text-red-400 transition-colors"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
          <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  )
}