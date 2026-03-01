'use client'

// Kategori yönetim paneli — Properties panelindeki "Manage" butonuna tıklayınca açılır
// Özellikler: yeni kategori ekle, sürükle-bırak sıralama, isWheelchair toggle,
//             renk seçici (ColorPicker), label düzenleme, silme
// dnd-kit/sortable ile sıralama — store.reorderCategories ile sync

import { useState, useCallback, useRef, useEffect } from 'react'
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
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Tooltip } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import DragIndicatorIcon from '@mui/icons-material/DragIndicator'
import AccessibleIcon from '@mui/icons-material/Accessible'
import CloseIcon from '@mui/icons-material/Close'
import { useShallow } from 'zustand/react/shallow'
import { useEditorStore } from '@/store/editor.store'
import ColorPicker from '@/components/ui/ColorPicker'
import type { Category } from '@/store/types'
import { CATEGORY_PRESET_COLORS } from '@/lib/constants'

interface CategoryManagePanelProps {
  onClose: () => void
}

export default function CategoryManagePanel({ onClose }: CategoryManagePanelProps) {
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

  // Hangi kategorinin renk seçicisi açık
  const [openColorPickerId, setOpenColorPickerId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      // 5px threshold — yanlışlıkla drag başlamasın
      activationConstraint: { distance: 5 },
    }),
  )

  // Sıralama bitti — store'a yeni sırayı yaz
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id) return

      const oldIndex = categories.findIndex((c) => c.id === active.id)
      const newIndex = categories.findIndex((c) => c.id === over.id)
      if (oldIndex === -1 || newIndex === -1) return

      const reordered = arrayMove(categories, oldIndex, newIndex)
      reorderCategories(reordered.map((c) => c.id))
    },
    [categories, reorderCategories],
  )

  // Yeni kategori ekle — preset renklerden sıradakini al
  const handleAdd = useCallback(() => {
    const colorIndex = categories.length % CATEGORY_PRESET_COLORS.length
    addCategory('New category', CATEGORY_PRESET_COLORS[colorIndex])
  }, [categories.length, addCategory])

  // Renk seçici toggle
  const toggleColorPicker = useCallback((id: string) => {
    setOpenColorPickerId((prev) => (prev === id ? null : id))
  }, [])

  // Dışarı tıklayınca renk seçiciyi kapat
  const panelRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!openColorPickerId) return
    const handle = (e: MouseEvent) => {
      if (!panelRef.current?.contains(e.target as Node)) {
        setOpenColorPickerId(null)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [openColorPickerId])

  return (
    <div
      ref={panelRef}
      className="
        flex flex-col w-72 max-h-[480px]
        bg-[var(--color-surface-2)] border border-[var(--color-border)]
        rounded-lg shadow-xl overflow-hidden
      "
    >
      {/* Panel başlık */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)] shrink-0">
        <span className="text-sm font-semibold text-[var(--color-text)]">Categories</span>
        <button
          type="button"
          onClick={onClose}
          className="
            w-6 h-6 flex items-center justify-center rounded
            text-[var(--color-text-muted)] hover:text-[var(--color-text)]
            hover:bg-[var(--color-surface)] transition-colors duration-100
            cursor-pointer border-none bg-transparent
          "
          aria-label="Kapat"
        >
          <CloseIcon sx={{ fontSize: 16 }} />
        </button>
      </div>

      {/* Kategori listesi */}
      <div className="flex-1 overflow-y-auto py-1">
        {categories.length === 0 ? (
          <p className="px-4 py-6 text-xs text-[var(--color-text-muted)] text-center">
            Henüz kategori yok. Yeni ekle.
          </p>
        ) : (
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
                <SortableCategoryItem
                  key={category.id}
                  category={category}
                  isColorOpen={openColorPickerId === category.id}
                  onColorToggle={toggleColorPicker}
                  onColorChange={(color) => updateCategory(category.id, { color })}
                  onLabelChange={(label) => updateCategory(category.id, { label })}
                  onWheelchairToggle={() =>
                    updateCategory(category.id, { isWheelchair: !category.isWheelchair })
                  }
                  onRemove={() => removeCategory(category.id)}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Yeni ekle */}
      <div className="shrink-0 px-3 py-2 border-t border-[var(--color-border)]">
        <button
          type="button"
          onClick={handleAdd}
          className="
            flex items-center gap-1.5 w-full px-2 py-1.5 rounded-md
            text-xs text-[var(--color-accent)] font-medium
            hover:bg-[var(--color-surface)] transition-colors duration-100
            cursor-pointer border-none bg-transparent
          "
        >
          <AddIcon sx={{ fontSize: 14 }} />
          Create new category
        </button>
      </div>
    </div>
  )
}

// --- Sortable kategori satırı ---

interface SortableCategoryItemProps {
  category: Category
  isColorOpen: boolean
  onColorToggle: (id: string) => void
  onColorChange: (color: string) => void
  onLabelChange: (label: string) => void
  onWheelchairToggle: () => void
  onRemove: () => void
}

function SortableCategoryItem({
  category,
  isColorOpen,
  onColorToggle,
  onColorChange,
  onLabelChange,
  onWheelchairToggle,
  onRemove,
}: SortableCategoryItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id })

  const [labelValue, setLabelValue] = useState(category.label)
  const inputRef = useRef<HTMLInputElement>(null)

  // Store'dan gelen label değişimini yakala (başka işlemden güncellenirse)
  useEffect(() => {
    setLabelValue(category.label)
  }, [category.label])

  const handleLabelBlur = useCallback(() => {
    const trimmed = labelValue.trim()
    if (trimmed && trimmed !== category.label) {
      onLabelChange(trimmed)
    } else {
      // Boş bırakıldıysa eski değere dön
      setLabelValue(category.label)
    }
  }, [labelValue, category.label, onLabelChange])

  const handleLabelKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') inputRef.current?.blur()
      if (e.key === 'Escape') {
        setLabelValue(category.label)
        inputRef.current?.blur()
      }
    },
    [category.label],
  )

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  }

  return (
    <div ref={setNodeRef} style={style}>
      {/* Ana satır */}
      <div
        className="
          flex items-center gap-1.5 px-2 py-1.5
          hover:bg-[var(--color-surface)] transition-colors duration-75
          group
        "
      >
        {/* Sürükle tutacağı */}
        <button
          type="button"
          className="
            flex items-center justify-center w-5 h-5 shrink-0
            text-[var(--color-text-muted)] opacity-0 group-hover:opacity-100
            cursor-grab active:cursor-grabbing
            transition-opacity duration-100 border-none bg-transparent
          "
          aria-label="Sırala"
          {...attributes}
          {...listeners}
        >
          <DragIndicatorIcon sx={{ fontSize: 16 }} />
        </button>

        {/* Tekerlekli sandalye toggle */}
        <Tooltip title={category.isWheelchair ? 'Erişilebilirlik kaldır' : 'Erişilebilir yap'} placement="top">
          <button
            type="button"
            onClick={onWheelchairToggle}
            className="
              flex items-center justify-center w-5 h-5 shrink-0 rounded
              transition-colors duration-100 cursor-pointer border-none bg-transparent
            "
            style={{
              color: category.isWheelchair
                ? 'var(--color-accent)'
                : 'var(--color-text-muted)',
            }}
            aria-pressed={category.isWheelchair}
            aria-label="Erişilebilirlik"
          >
            <AccessibleIcon sx={{ fontSize: 16 }} />
          </button>
        </Tooltip>

        {/* Renk dairesi — tıklayınca ColorPicker açılır */}
        <Tooltip title="Renk seç" placement="top">
          <button
            type="button"
            onClick={() => onColorToggle(category.id)}
            className="
              w-5 h-5 rounded-full border-2 shrink-0 cursor-pointer
              transition-transform duration-100 hover:scale-110
            "
            style={{
              backgroundColor: category.color,
              borderColor: isColorOpen ? 'var(--color-text)' : 'transparent',
            }}
            aria-label="Renk seç"
          />
        </Tooltip>

        {/* Label input */}
        <input
          ref={inputRef}
          type="text"
          value={labelValue}
          onChange={(e) => setLabelValue(e.target.value)}
          onBlur={handleLabelBlur}
          onKeyDown={handleLabelKeyDown}
          maxLength={48}
          className="
            flex-1 h-6 px-1.5 rounded text-xs bg-transparent
            text-[var(--color-text)] outline-none
            hover:bg-[var(--color-surface-2)]
            focus:bg-[var(--color-surface-2)] focus:ring-1 focus:ring-[var(--color-accent)]
            transition-colors duration-100
          "
        />

        {/* Sil butonu */}
        <Tooltip title="Sil" placement="top">
          <button
            type="button"
            onClick={onRemove}
            className="
              flex items-center justify-center w-5 h-5 shrink-0 rounded
              text-[var(--color-text-muted)]
              opacity-0 group-hover:opacity-100
              hover:text-red-400 hover:bg-[var(--color-surface-2)]
              transition-all duration-100 cursor-pointer border-none bg-transparent
            "
            aria-label="Sil"
          >
            <DeleteOutlineIcon sx={{ fontSize: 16 }} />
          </button>
        </Tooltip>
      </div>

      {/* Renk seçici — açık olduğunda satırın altında genişler */}
      {isColorOpen && (
        <div className="px-4 pb-3 pt-1 border-b border-[var(--color-border)]">
          <ColorPicker
            value={category.color}
            onChange={onColorChange}
          />
        </div>
      )}
    </div>
  )
}