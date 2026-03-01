'use client'

// Section Layer — aktif floor'daki tüm section'ları render eder
//
// - Section tool aktifken dbl-click ile editing context'e girilemez
// - Editing context aktifken drag devre dışı (isLocked guard SectionShape'te)
// - Guide lines SectionDragGuides bileşeni ile yönetilir

import { memo, useCallback } from 'react'
import { Layer, Rect } from 'react-konva'
import { useShallow } from 'zustand/react/shallow'
import { useEditorStore } from '@/store/editor.store'
import { useSectionDrag } from '@/hooks/section/useSectionDrag'
import SectionShape from '@/canvas/tools/section/SectionShape'
import SectionCurveEditor from '@/canvas/tools/section/SectionCurveEditor'
import type { Row } from '@/store/types'
import SectionDragGuides from '@/canvas/tools/section/SectionDragGuides'

const NOOP_ENTER = (_id: string) => { }

function SectionLayer({
  stageRef,
  isDark = false,
  scale = 1,
}: {
  stageRef: React.RefObject<import('konva').Stage | null>
  isDark?: boolean
  scale?: number
}) {
  const {
    sections,
    floorObjects,
    selectedObjectIds,
    activeSectionId,
    activeFloorId,
    activeTool,
    selectObjects,
    enterSectionContext,
  } = useEditorStore(
    useShallow((s) => {
      const floor = s.chart?.floors.find((f) => f.id === s.activeFloorId)
      return {
        sections: floor?.sections ?? [],
        floorObjects: floor?.objects ?? [],
        selectedObjectIds: s.selectedObjectIds,
        activeSectionId: s.editingContext?.type === 'section'
          ? s.editingContext.sectionId
          : null,
        activeFloorId: s.activeFloorId,
        activeTool: s.activeTool,
        selectObjects: s.selectObjects,
        enterSectionContext: s.enterSectionContext,
      }
    }),
  )

  const isSectionToolActive =
    activeTool === 'section' || activeTool === 'rectangular-section'

  // Row tool aktifken section'lar click'i engellememeli — event Stage'e ulaşmalı
  const isRowToolActive = activeTool === 'row' || activeTool === 'multiple-row'

  const { startSectionDrag, isDraggingRef, draggingSectionId } = useSectionDrag(stageRef)

  const handleSelect = useCallback(
    (sectionId: string) => selectObjects([sectionId]),
    [selectObjects],
  )

  const handleEnter = useCallback(
    (sectionId: string) => {
      if (!activeFloorId) return
      enterSectionContext(sectionId, activeFloorId)
    },
    [activeFloorId, enterSectionContext],
  )

  if (!sections?.length) return null

  return (
    <Layer>
      {activeSectionId && (
        <Rect
          x={-50000}
          y={-50000}
          width={100000}
          height={100000}
          fill="rgba(0,0,0,0.45)"
          listening={false}
        />
      )}

      {sections.map((section) => {
        if (!section?.id) return null
        // Editing context aktifken — aktif section dışındakiler etkileşime kapalı
        // Row tool aktifken — tüm section'lar listening=false (click Stage'e ulaşsın)
        const isBlocked =
          isRowToolActive ||
          (activeSectionId !== null && activeSectionId !== section.id)

        // Normal modda (editing context yok) — section'a ait row'ları stripe göster
        // Editing context bu section ise — row'lar EditorCanvas'ta tam render edilir
        const showStripes = activeSectionId !== section.id
        // objectIds + row.sectionId fallback — her iki kaynaktan eşleştir
        const blockRows: Row[] = showStripes
          ? floorObjects.filter(
            (o): o is Row =>
              o.type === 'row' &&
              (section.objectIds.includes(o.id) || o.sectionId === section.id)
          )
          : []

        return (
          <SectionShape
            key={section.id}
            section={section}
            isSelected={selectedObjectIds.includes(section.id)}
            isEditing={activeSectionId === section.id}
            listening={!isBlocked}
            blockRows={blockRows}
            isDark={isDark}
            onSelect={handleSelect}
            onEnter={isSectionToolActive ? NOOP_ENTER : handleEnter}
            onDragStart={startSectionDrag}
          />
        )
      })}

      {/* Curve edit anchor'ları — curveEditMode aktif section için */}
      {sections
        .filter((s) => s.curveEditMode && s.shape === 'polygon')
        .map((s) => (
          <SectionCurveEditor
            key={s.id}
            section={s}
            scale={scale}
          />
        ))
      }

      {/* Drag kılavuz çizgileri — listening: false layer'da render edilir */}
      <SectionDragGuides
        stageRef={stageRef}
        isDraggingRef={isDraggingRef}
        draggingSectionId={draggingSectionId}
      />
    </Layer>
  )
}

export default memo(SectionLayer)