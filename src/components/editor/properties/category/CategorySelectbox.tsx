'use client'

// Category Selectbox — seçili row'lara (koltuk bazlı) kategori ataması
// Çoklu seçim destekler. Seçili kategoriye tekrar tıklayınca atama kalkar.
// Manage butonu CategoryManagePanel'i açar.

import { useState, useRef, useEffect, useCallback } from 'react'
import { useEditorStore, useSelectedRowCategories } from '@/store/editor.store'
import { useShallow } from 'zustand/react/shallow'
import { CategoryManagePanel } from './CategoryManagePanel'

export function CategorySelectbox() {
  const [isOpen, setIsOpen] = useState(false)
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const { assignedIds, categories } = useSelectedRowCategories()

  const { assignCategory, removeCategory } = useEditorStore(
    useShallow((s) => ({
      assignCategory: s.assignCategoryToSelectedRows,
      removeCategory: s.removeCategoryFromSelectedRows,
    })),
  )

  // Dropdown dışı tıklamada kapat
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  const handleToggleCategory = useCallback(
    (categoryId: string) => {
      if (assignedIds.includes(categoryId)) {
        removeCategory(categoryId)
      } else {
        assignCategory(categoryId)
      }
    },
    [assignedIds, assignCategory, removeCategory],
  )

  // Görüntülenecek özet metin
  const summaryText = (() => {
    if (assignedIds.length === 0) return 'No category assigned'
    if (assignedIds.length === 1) {
      return categories.find((c) => c.id === assignedIds[0])?.label ?? 'No category assigned'
    }
    return `${assignedIds.length} categories`
  })()

  // Özet renk gösterimi
  const summaryColors = assignedIds
    .slice(0, 3)
    .map((id) => categories.find((c) => c.id === id)?.color)
    .filter(Boolean) as string[]

  return (
    <div className="space-y-1.5">
      {/* Başlık satırı */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-[var(--color-text)] uppercase tracking-wide">
          Category
        </span>
        <button
          onClick={() => setIsPanelOpen(true)}
          className="
            flex items-center gap-1 text-xs text-[var(--color-text-muted)]
            hover:text-[var(--color-text)] transition-colors
          "
        >
          {/* Ayar ikonu */}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          Manage
        </button>
      </div>

      {/* Dropdown tetikleyici */}
      <div ref={dropdownRef} className="relative">
        <button
          onClick={() => setIsOpen((v) => !v)}
          className="
            w-full flex items-center justify-between gap-2
            px-3 py-2 rounded-md text-sm
            bg-[var(--color-surface-2)] border border-[var(--color-border)]
            hover:border-[var(--color-text-muted)] transition-colors
            text-left
          "
        >
          <div className="flex items-center gap-2 min-w-0">
            {/* Renk göstergeleri */}
            {summaryColors.length > 0 && (
              <div className="flex -space-x-1 flex-shrink-0">
                {summaryColors.map((color, i) => (
                  <span
                    key={i}
                    className="w-3.5 h-3.5 rounded-full border border-[var(--color-surface-2)]"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            )}
            <span className={`truncate ${assignedIds.length === 0 ? 'text-[var(--color-text-muted)]' : 'text-[var(--color-text)]'}`}>
              {summaryText}
            </span>
          </div>

          {/* Ok ikonu */}
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            width="14"
            height="14"
            className={`flex-shrink-0 text-[var(--color-text-muted)] transition-transform ${isOpen ? 'rotate-180' : ''}`}
          >
            <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* Dropdown listesi */}
        {isOpen && (
          <div className="
            absolute top-full left-0 right-0 mt-1 z-30
            bg-[var(--color-surface)] border border-[var(--color-border)]
            rounded-md shadow-xl overflow-hidden
          ">
            {categories.length === 0 && (
              <p className="text-xs text-[var(--color-text-muted)] text-center py-4 px-3">
                Henüz kategori yok.{' '}
                <button
                  onClick={() => { setIsOpen(false); setIsPanelOpen(true) }}
                  className="text-[var(--color-accent)] underline"
                >
                  Ekle
                </button>
              </p>
            )}

            {categories.map((category) => {
              const isAssigned = assignedIds.includes(category.id)
              return (
                <button
                  key={category.id}
                  onClick={() => handleToggleCategory(category.id)}
                  className="
                    w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left
                    hover:bg-[var(--color-surface-2)] transition-colors
                  "
                >
                  {/* Kategori renk dairesi */}
                  <span
                    className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: category.color }}
                  />

                  {/* Wheelchair rozeti */}
                  {category.isWheelchair && (
                    <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14" className="text-[var(--color-accent)] flex-shrink-0">
                      <path d="M12 2a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm-1 5h-1a1 1 0 0 0 0 2h1v3.382l-2.447 4.894A1 1 0 0 0 9.447 19H15a1 1 0 0 0 .894-1.447L13 12.382V9h1a1 1 0 0 0 0-2h-3z" />
                    </svg>
                  )}

                  <span className={`flex-1 truncate ${isAssigned ? 'text-[var(--color-text)]' : 'text-[var(--color-text-muted)]'}`}>
                    {category.label}
                  </span>

                  {/* Seçim işareti */}
                  {isAssigned && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14" className="text-[var(--color-accent)] flex-shrink-0">
                      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Manage Panel */}
      <CategoryManagePanel
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
      />
    </div>
  )
}