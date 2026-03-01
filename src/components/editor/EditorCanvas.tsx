'use client'

// Ana canvas bileşeni — Konva Stage, pan, zoom, grid, araç yönetimi
// Stage pozisyonu imperatif yönetilir — pan'de React render tetiklenmez
// Keyboard listener'lar ref pattern ile kurulur — stale closure olmaz

import { useRef, useEffect, useCallback, useState, useMemo } from 'react'
import { Stage, Layer } from 'react-konva'
import type Konva from 'konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import { useShallow } from 'zustand/react/shallow'
import { useTheme } from '@/hooks/useTheme'
import { useEditorStore } from '@/store/editor.store'
import { useCanvasZoom } from '@/hooks/canvas/useCanvasZoom'
import { useRowTool } from '@/hooks/row/useRowTool'
import { useSelectTool } from '@/hooks/canvas/useSelectTool'
import { useDragMove } from '@/hooks/useDragMove'
import { useMarqueeSelect } from '@/hooks/useMarqueeSelect'
import { useSectionTool } from '@/hooks/section/useSectionTool'
import { useSectionZoom } from '@/hooks/section/useSectionZoom'
import GridLayer from '@/canvas/layers/GridLayer'
import SectionLayer from '@/canvas/layers/SectionLayer'
import SelectionLayer from '@/canvas/layers/SelectionLayer'
import CenterMark from '@/canvas/CenterMark'
import RowShape from '@/canvas/tools/row/RowShape'
import RowPreview from '@/canvas/tools/row/RowPreview'
import RowDragGuides from '@/canvas/tools/row/RowDragGuides'
import SectionPreview from '@/canvas/tools/section/SectionPreview'
import MarqueeRect from '@/canvas/shared/MarqueeRect'
import CanvasControls from './CanvasControls'
import type { Row } from '@/store/types'

export default function EditorCanvas() {
  const containerRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<Konva.Stage>(null)
  const isPanningRef = useRef(false)
  const initializedRef = useRef(false)

  const [size, setSize] = useState({ width: 0, height: 0 })
  const [scale, setScale] = useState(1)
  const [isPanning, setIsPanning] = useState(false)

  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const {
    activeTool,
    activeFloor,
    sections,
    categories,
    editingContext,
    setViewport,
    setTemporaryTool,
    restorePreviousTool,
    seatSpacing,
  } = useEditorStore(
    useShallow((s) => ({
      activeTool: s.activeTool,
      activeFloor: s.chart?.floors.find((f) => f.id === s.activeFloorId) ?? null,
      // Sections referansı — sectionObjectIds useMemo ile hesaplanır
      sections: s.chart?.floors.find((f) => f.id === s.activeFloorId)?.sections ?? [],
      categories: s.chart?.categories ?? [],
      editingContext: s.editingContext,
      setViewport: s.setViewport,
      setTemporaryTool: s.setTemporaryTool,
      restorePreviousTool: s.restorePreviousTool,
      seatSpacing: s.rowToolSettings.seatSpacing,
    })),
  )

  // section.objectIds → rowId:sectionId map — useMemo ile, selector'da değil
  // Selector'da new Map() oluşturmak her render'da yeni referans → infinite loop
  const sectionObjectIds = useMemo(() => {
    const map = new Map<string, string>()
    for (const section of sections) {
      for (const objId of section.objectIds) {
        map.set(objId, section.id)
      }
    }
    return map
  }, [sections])

  // ─── Tool Hook'ları ───────────────────────────────────────────────────────

  const { handleWheel, zoomIn, zoomOut } = useCanvasZoom()

  const {
    toolState: rowToolState,
    snapTarget: rowSnapTarget,
    handleClick: handleRowClick,
    handleMouseMove: handleRowMouseMove,
    handleKeyDown: handleRowKeyDown,
  } = useRowTool(stageRef)

  const {
    toolState: sectionToolState,
    handleStageClick: handleSectionClick,
    handleStageMouseMove: handleSectionMouseMove,
    handleStageDblClick: handleSectionDblClick,
    handleMouseDown: handleSectionMouseDown,
    handleMouseUp: handleSectionMouseUp,
    handleKeyDown: handleSectionKeyDown,
  } = useSectionTool(stageRef)

  // Editing context değişince section'a smooth zoom animasyonu
  useSectionZoom(stageRef)

  const { handleStageClick: handleSelectStageClick, handleObjectSelect } = useSelectTool(stageRef)
  const { marqueeRect, dragMode, handleMarqueeMouseDown } = useMarqueeSelect(stageRef)
  const { startDrag, isDraggingRef, draggingIdsRef } = useDragMove({ stageRef })

  // ─── Container Boyutu ─────────────────────────────────────────────────────

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setSize({ width, height })
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  // İlk boyut gelince origin'i ekran ortasına al
  useEffect(() => {
    if (!size.width || !stageRef.current || initializedRef.current) return
    initializedRef.current = true
    const x = size.width / 2
    const y = size.height / 2
    stageRef.current.position({ x, y })
    setViewport({ x, y, scale: 1 })
  }, [size, setViewport])

  // Scale değişimini dinle → SectionPreview / RowPreview için
  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    const update = () => setScale(stage.scaleX())
    stage.on('scaleXChange', update)
    return () => { stage.off('scaleXChange', update) }
  }, [size.width])

  // ─── Keyboard — ref pattern (stale closure olmaz) ─────────────────────────

  const handleRowKeyDownRef = useRef(handleRowKeyDown)
  const handleSectionKeyDownRef = useRef(handleSectionKeyDown)
  const setTemporaryToolRef = useRef(setTemporaryTool)
  const restorePreviousRef = useRef(restorePreviousTool)

  useEffect(() => { handleRowKeyDownRef.current = handleRowKeyDown }, [handleRowKeyDown])
  useEffect(() => { handleSectionKeyDownRef.current = handleSectionKeyDown }, [handleSectionKeyDown])
  useEffect(() => { setTemporaryToolRef.current = setTemporaryTool }, [setTemporaryTool])
  useEffect(() => { restorePreviousRef.current = restorePreviousTool }, [restorePreviousTool])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return

      const store = useEditorStore.getState()
      switch (e.code) {
        case 'Space':
          e.preventDefault()
          if (store.activeTool !== 'hand') setTemporaryToolRef.current('hand')
          break
        case 'KeyH': store.setActiveTool('hand'); break
        case 'KeyV': store.setActiveTool('select'); break
        case 'KeyW': store.setActiveTool('row'); break
        case 'KeyS': store.setActiveTool('section'); break
        case 'Escape':
          // Editing context'ten çık
          if (store.editingContext?.type === 'section') store.exitSectionContext()
          break
        case 'Delete':
        case 'Backspace':
          store.removeSelectedObjects()
          break
        case 'KeyZ':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            e.shiftKey ? store.redo() : store.undo()
          }
          break
        default:
          handleRowKeyDownRef.current(e)
          handleSectionKeyDownRef.current(e)
      }
    }

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') restorePreviousRef.current()
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])

  // ─── Stage Event Handler'lar ──────────────────────────────────────────────

  const isSectionTool = activeTool === 'section' || activeTool === 'rectangular-section'

  const handleMouseDown = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      if (activeTool === 'hand') {
        const stage = stageRef.current
        if (!stage || e.target !== stage) return
        isPanningRef.current = true
        setIsPanning(true)
        stage.startDrag()
        return
      }
      // Rectangular section: mousedown ile çizim başlar
      if (isSectionTool) {
        handleSectionMouseDown(e)
        return
      }
      handleMarqueeMouseDown(e)
    },
    [activeTool, isSectionTool, handleSectionMouseDown, handleMarqueeMouseDown],
  )

  const handleMouseUp = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      if (isPanningRef.current) {
        isPanningRef.current = false
        setIsPanning(false)
        stageRef.current?.stopDrag()
        return
      }
      if (isSectionTool) handleSectionMouseUp(e)
    },
    [isSectionTool, handleSectionMouseUp],
  )

  const handleStageMouseMove = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      if (activeTool === 'row') handleRowMouseMove(e)
      if (isSectionTool) handleSectionMouseMove(e)
    },
    [activeTool, isSectionTool, handleRowMouseMove, handleSectionMouseMove],
  )

  const handleStageClick = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      if (activeTool === 'row') handleRowClick(e)
      if (activeTool === 'section') handleSectionClick(e)
      if (activeTool === 'select') handleSelectStageClick(e)
    },
    [activeTool, handleRowClick, handleSectionClick, handleSelectStageClick],
  )

  const handleStageDblClickCb = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      if (activeTool === 'section') handleSectionDblClick(e)
    },
    [activeTool, handleSectionDblClick],
  )

  const handleZoomIn = useCallback(() => zoomIn(stageRef.current!), [zoomIn])
  const handleZoomOut = useCallback(() => zoomOut(stageRef.current!), [zoomOut])

  // ─── Cursor ───────────────────────────────────────────────────────────────

  const cursor =
    activeTool === 'row' ? 'crosshair' :
      isSectionTool ? 'crosshair' :
        activeTool === 'hand' ? (isPanning ? 'grabbing' : 'grab') :
          (activeTool === 'select' && marqueeRect) ? 'crosshair' :
            'default'

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div
      ref={containerRef}
      style={{ gridArea: 'canvas', cursor }}
      className="relative overflow-hidden bg-canvas-bg"
    >
      {size.width > 0 && (
        <>
          <GridLayer
            stageRef={stageRef}
            width={size.width}
            height={size.height}
            isDark={isDark}
          />

          <Stage
            ref={stageRef}
            width={size.width}
            height={size.height}
            onWheel={handleWheel}
            onClick={handleStageClick}
            onDblClick={handleStageDblClickCb}
            onMouseDown={handleMouseDown}
            onMouseMove={handleStageMouseMove}
            onMouseUp={handleMouseUp}
          >
            {/* Katman 1: Section'lar — nesnelerin arkasında */}
            <SectionLayer stageRef={stageRef} isDark={isDark} />

            {/* Katman 2: Nesneler */}
            <Layer>
              <CenterMark scale={scale} />

              {activeFloor?.objects
                .filter((o): o is Row => o.type === 'row')
                .map((row) => {
                  // Section'a ait mi?
                  // objectIds map'ini önce kontrol et, bulamazsa row.sectionId fallback
                  const ownerSectionId =
                    sectionObjectIds.get(row.id) ??
                    (row.sectionId || null)
                  const activeCtxSection = editingContext?.type === 'section'
                    ? editingContext.sectionId
                    : null

                  // Section'a ait + editing context o section değil → block mod
                  // SectionShape içinde stripe olarak gösterilir, burada render etme
                  const isBlockMode =
                    ownerSectionId !== null &&
                    ownerSectionId !== activeCtxSection

                  if (isBlockMode) return null

                  return (
                    <RowShape
                      key={row.id}
                      row={row}
                      categories={categories}
                      isSelected={false}
                      onSelect={handleObjectSelect}
                      onDragStart={startDrag}
                    />
                  )
                })}
            </Layer>

            {/* Katman 3: Seçim — Transformer + resize + rotation handles */}
            <SelectionLayer
              stageRef={stageRef}
              isDraggingRef={isDraggingRef}
            />

            {/* Katman 4: Preview + Drag Guides — listening: false */}
            <Layer listening={false}>
              <RowPreview
                toolState={rowToolState}
                snapTarget={rowSnapTarget}
                scale={scale}
                seatSpacing={seatSpacing}
              />
              <RowDragGuides
                stageRef={stageRef}
                isDraggingRef={isDraggingRef}
                draggingIdsRef={draggingIdsRef}
              />
              {isSectionTool && (
                <SectionPreview
                  toolState={sectionToolState}
                  scale={scale}
                />
              )}
              {marqueeRect && (
                <MarqueeRect rect={marqueeRect} dragMode={dragMode} />
              )}
            </Layer>
          </Stage>
        </>
      )}

      <CanvasControls
        stageRef={stageRef}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
      />
    </div>
  )
}