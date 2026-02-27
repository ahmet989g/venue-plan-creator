'use client'

// Properties paneli — aktif tool veya seçili objeye göre ilgili bileşeni render eder
//
// Yönlendirme:
//   activeTool === 'row'           → Row Tool ayarları (spacing)
//   select + 1+ row seçili        → RowProperties — tekli ve çoklu her ikisini destekler
//   select + seçim yok            → boş durum
//   (ileride: Table, Booth, Section properties buraya eklenir)

import { useMemo } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useEditorStore } from '@/store/editor.store'
import RowToolProperties from './properties/RowToolProperties'
import RowProperties from './properties/RowProperties'
import type { Row } from '@/store/types'

export default function PropertiesPanel() {
  const { activeTool, selectedObjectIds, activeFloor } = useEditorStore(
    useShallow((s) => ({
      activeTool: s.activeTool,
      selectedObjectIds: s.selectedObjectIds,
      activeFloor: s.chart?.floors.find((f) => f.id === s.activeFloorId) ?? null,
    })),
  )

  // Seçili row'ları hesapla
  const selectedRows = useMemo(
    () =>
      (activeFloor?.objects ?? []).filter(
        (o): o is Row => o.type === 'row' && selectedObjectIds.includes(o.id),
      ),
    [activeFloor, selectedObjectIds],
  )

  const hasSelectedRows = selectedRows.length > 0

  return (
    <aside
      style={{ gridArea: 'panel' }}
      className="h-full w-80 shrink-0 border-l border-[var(--color-border)] bg-[var(--color-surface)] overflow-y-auto flex flex-col"
    >
      {/* Row tool aktifken → çizim ayarları */}
      {activeTool === 'row' && <RowToolProperties />}

      {/* Select tool + 1 veya daha fazla row seçili → RowProperties */}
      {activeTool === 'select' && hasSelectedRows && (
        <RowProperties rows={selectedRows} />
      )}

      {/* Select tool + seçim yok → boş durum */}
      {activeTool === 'select' && !hasSelectedRows && (
        <EmptyState />
      )}

      {/* TODO: Table, Booth, Section properties buraya eklenecek */}
    </aside>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-2 px-4 py-12 text-center">
      <p className="text-xs text-[var(--color-text-muted)]">
        Select an object to see its properties.
      </p>
    </div>
  )
}