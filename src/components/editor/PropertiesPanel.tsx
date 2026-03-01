'use client'

// Properties paneli — aktif tool veya seçili objeye göre ilgili bileşeni render eder
//
// Yönlendirme:
//   activeTool === 'row'    → Row Tool ayarları (spacing)
//   select + row seçili     → RowProperties
//   select + section seçili → SectionProperties (label + curve editing)
//   select + seçim yok      → boş durum

import { useMemo } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useEditorStore } from '@/store/editor.store'
import RowToolProperties from './properties/row/RowToolProperties'
import RowProperties from './properties/row/RowProperties'
import SectionProperties from './properties/section/SectionProperties'
import type { Row, Section } from '@/store/types'

export default function PropertiesPanel() {
  const { activeTool, selectedObjectIds, activeFloor } = useEditorStore(
    useShallow((s) => ({
      activeTool: s.activeTool,
      selectedObjectIds: s.selectedObjectIds,
      activeFloor: s.chart?.floors.find((f) => f.id === s.activeFloorId) ?? null,
    })),
  )

  // Seçili section'ları hesapla (floor.sections'dan)
  const selectedSection = useMemo<Section | null>(() => {
    if (!activeFloor || selectedObjectIds.length !== 1) return null
    return activeFloor.sections.find((s) => selectedObjectIds.includes(s.id)) ?? null
  }, [activeFloor, selectedObjectIds])

  // Seçili row'ları hesapla
  const selectedRows = useMemo(
    () =>
      (activeFloor?.objects ?? []).filter(
        (o): o is Row => o.type === 'row' && selectedObjectIds.includes(o.id),
      ),
    [activeFloor, selectedObjectIds],
  )

  const hasSelectedRows = selectedRows.length > 0
  const hasSelectedSection = selectedSection !== null

  return (
    <aside
      style={{ gridArea: 'panel' }}
      className="h-full w-80 shrink-0 border-l border-[var(--color-border)] bg-[var(--color-surface)] overflow-y-auto flex flex-col"
    >
      {/* Row tool aktifken → çizim ayarları */}
      {activeTool === 'row' && <RowToolProperties />}

      {/* Select tool + section seçili → SectionProperties */}
      {activeTool === 'select' && hasSelectedSection && (
        <SectionProperties section={selectedSection!} />
      )}

      {/* Select tool + row seçili → RowProperties */}
      {activeTool === 'select' && hasSelectedRows && !hasSelectedSection && (
        <RowProperties rows={selectedRows} />
      )}

      {/* Select tool + seçim yok → boş durum */}
      {activeTool === 'select' && !hasSelectedRows && !hasSelectedSection && (
        <EmptyState />
      )}
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