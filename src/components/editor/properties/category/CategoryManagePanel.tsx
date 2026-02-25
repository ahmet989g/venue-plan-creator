'use client'

// Category Manage Panel — properties panel solundan açılan slide-in panel
// Kategori ekleme, düzenleme, sıralama (drag-to-reorder) ve silme işlemleri burada.

import { useCallback } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { useEditorStore } from '@/store/editor.store'
import { useShallow } from 'zustand/react/shallow'
import { CategoryItem } from './CategoryItem'

interface CategoryManagePanelProps {
  isOpen: boolean
  onClose: () => void
}

export function CategoryManagePanel({ isOpen, onClose }: CategoryManagePanelProps) {
  const { categories, addCategory, updateCategory, removeCategory, reorderCategories } =
    useEditorStore(
      useShallow((s) => ({
        categories: s.chart?.categories ?? [],
        addCategory: s.addCategory,
        updateCategory: s.updateCategory,
        removeCategory: s.removeCategory,
        reorderCategories: s.reorderCategories,
      })),
    )

  // dnd-kit sensör — küçük hareket threshold'u ile yanlışlıkla sürüklemeyi önler
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id) return

      const oldIndex = categories.findIndex((c) => c.id === active.id)
      const newIndex = categories.findIndex((c) => c.id === over.id)
      const reordered = arrayMove(categories, oldIndex, newIndex)
      reorderCategories(reordered.map((c) => c.id))
    },
    [categories, reorderCategories],
  )

  // Panel dışına tıklayınca kapat
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose()
    },
    [onClose],
  )

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop — panel dışı tıklamayı yakalar */}
      <div
        className="fixed inset-0 z-40"
        onClick={handleBackdropClick}
      />

      {/* Panel — properties panelinin solundan açılır */}
      <div
        className="
          fixed right-[284px] top-0 bottom-0 z-40
          w-72 flex flex-col
          bg-[var(--color-surface)] border-l border-[var(--color-border)]
          shadow-2xl
        "
      >
        {/* Başlık */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
          <div>
            <h2 className="text-sm font-semibold text-[var(--color-text)]">Categories</h2>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
              Kategoriler bilet fiyatlandırması için kullanılır.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
            aria-label="Kapat"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Yeni kategori ekle */}
        <div className="px-4 py-2 border-b border-[var(--color-border)]">
          <button
            onClick={() => addCategory('New category')}
            className="
              flex items-center gap-1.5 text-sm text-[var(--color-accent)]
              hover:opacity-80 transition-opacity
            "
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14">
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
            Create new category
          </button>
        </div>

        {/* Liste */}
        <div className="flex-1 overflow-y-auto py-2">
          {categories.length === 0 && (
            <p className="text-xs text-[var(--color-text-muted)] text-center mt-6 px-4">
              Henüz kategori yok. Yukarıdan ekle.
            </p>
          )}

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={categories.map((c) => c.id)}
              strategy={verticalListSortingStrategy}
            >
              {categories.map((category) => (
                <CategoryItem
                  key={category.id}
                  category={category}
                  onUpdate={(patch) => updateCategory(category.id, patch)}
                  onDelete={() => removeCategory(category.id)}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      </div>
    </>
  )
}