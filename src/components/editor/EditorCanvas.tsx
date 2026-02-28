'use client'

// Ana canvas bileşeni — Konva Stage, pan, zoom, grid, araç yönetimi
// Stage pozisyonu imperatif yönetilir — pan'de React render tetiklenmez
// Keyboard listener'lar ref pattern ile kurulur — stale closure olmaz

import { useRef, useEffect, useCallback, useState } from 'react'
import { Stage, Layer } from 'react-konva'
import type Konva from 'konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import { useShallow } from 'zustand/react/shallow'
import { useTheme } from '@/hooks/useTheme'
import { useEditorStore } from '@/store/editor.store'
import { useCanvasZoom } from '@/hooks/useCanvasZoom'
import { useRowTool } from '@/hooks/useRowTool'
import { useSelectTool } from '@/hooks/useSelectTool'
import { useDragMove } from '@/hooks/useDragMove'
import GridLayer from '@/canvas/layers/GridLayer'
import SelectionLayer from '@/canvas/layers/SelectionLayer'
import CenterMark from '@/canvas/CenterMark'
import RowShape from '@/canvas/objects/RowShape'
import RowPreview from '@/canvas/objects/RowPreview'
import RowDragGuides from '@/canvas/objects/RowDragGuides'
import CanvasControls from './CanvasControls'
import type { Row } from '@/store/types'
import { useMarqueeSelect } from '@/hooks/useMarqueeSelect'
import MarqueeRect from '@/canvas/shared/MarqueeRect'

export default function EditorCanvas() {
  const containerRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<Konva.Stage>(null)
  const isPanningRef = useRef(false)
  const [isPanning, setIsPanning] = useState(false)
  const initializedRef = useRef(false)

  const [size, setSize] = useState({ width: 0, height: 0 })
  const [scale, setScale] = useState(1)

  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const {
    activeTool, activeFloor, categories,
    setViewport, setTemporaryTool, restorePreviousTool, seatSpacing,
  } = useEditorStore(
    useShallow((s) => ({
      activeTool: s.activeTool,
      activeFloor: s.chart?.floors.find((f) => f.id === s.activeFloorId) ?? null,
      categories: s.chart?.categories ?? [],
      setViewport: s.setViewport,
      setTemporaryTool: s.setTemporaryTool,
      restorePreviousTool: s.restorePreviousTool,
      seatSpacing: s.rowToolSettings.seatSpacing,
    })),
  )

  const { handleWheel, zoomIn, zoomOut } = useCanvasZoom()

  const {
    toolState: rowToolState,
    snapTarget: rowSnapTarget,
    handleClick: handleRowClick,
    handleMouseMove: handleRowMouseMove,
    handleKeyDown: handleRowKeyDown,
  } = useRowTool(stageRef)

  const {
    handleStageClick: handleSelectStageClick,
    handleObjectSelect,
  } = useSelectTool(stageRef)

  const { marqueeRect, dragMode, handleMarqueeMouseDown } = useMarqueeSelect(stageRef)

  // draggingIdsRef — RowDragGuides'a aktarılır
  const { startDrag, isDraggingRef, draggingIdsRef } = useDragMove({ stageRef })

  // Container boyutunu izle
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

  // Scale değişimini dinle
  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    const update = () => setScale(stage.scaleX())
    stage.on('scaleXChange', update)
    return () => { stage.off('scaleXChange', update) }
  }, [size.width])

  // Keyboard — ref pattern
  const handleRowKeyDownRef = useRef(handleRowKeyDown)
  const setTemporaryToolRef = useRef(setTemporaryTool)
  const restorePreviousRef = useRef(restorePreviousTool)

  useEffect(() => { handleRowKeyDownRef.current = handleRowKeyDown }, [handleRowKeyDown])
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
      // Select tool: boş canvas → marquee başlat
      handleMarqueeMouseDown(e)
    },
    [activeTool, handleMarqueeMouseDown],
  )

  const handleMouseUp = useCallback(() => {
    if (!isPanningRef.current) return
    isPanningRef.current = false
    setIsPanning(false)
    stageRef.current?.stopDrag()
  }, [])

  const handleStageMouseMove = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      if (activeTool === 'row') handleRowMouseMove(e)
    },
    [activeTool, handleRowMouseMove],
  )

  const handleStageClick = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      if (activeTool === 'row') handleRowClick(e)
      if (activeTool === 'select') handleSelectStageClick(e)
    },
    [activeTool, handleRowClick, handleSelectStageClick],
  )

  const handleZoomIn = useCallback(() => zoomIn(stageRef), [zoomIn])
  const handleZoomOut = useCallback(() => zoomOut(stageRef), [zoomOut])

  const cursor =
    activeTool === 'row' ? 'crosshair' :
      activeTool === 'hand' ? (isPanning ? 'grabbing' : 'grab') :
        (activeTool === 'select' && marqueeRect) ? 'crosshair' :
          'default'

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
            onMouseDown={handleMouseDown}
            onMouseMove={handleStageMouseMove}
            onMouseUp={handleMouseUp}
          >
            {/* Katman 1: Nesneler */}
            <Layer>
              <CenterMark scale={scale} />

              {activeFloor?.objects
                .filter((o): o is Row => o.type === 'row')
                .map((row) => (
                  <RowShape
                    key={row.id}
                    row={row}
                    categories={categories}
                    isSelected={false}
                    onSelect={handleObjectSelect}
                    onDragStart={startDrag}
                  />
                ))}
            </Layer>

            {/* Katman 2: Seçim — Transformer + resize + rotation handles */}
            <SelectionLayer
              stageRef={stageRef}
              isDraggingRef={isDraggingRef}
            />

            {/* Katman 3: Preview + Drag Guides — listening: false */}
            <Layer listening={false}>
              {/* Row çizim önizlemesi */}
              <RowPreview
                toolState={rowToolState}
                snapTarget={rowSnapTarget}
                scale={scale}
                seatSpacing={seatSpacing}
              />

              {/* Taşıma kılavuz çizgileri — drag sırasında aktif */}
              <RowDragGuides
                stageRef={stageRef}
                isDraggingRef={isDraggingRef}
                draggingIdsRef={draggingIdsRef}
              />
              {/* Marquee seçim dikdörtgeni */}
              {marqueeRect && <MarqueeRect rect={marqueeRect} dragMode={dragMode} />}
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