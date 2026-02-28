'use client'

// Marquee (click & drag) seçim hook'u
//
// 3 mod — mousedown anında hangi tuşun basılı olduğuna göre belirlenir:
//   normal  → (tuş yok)   yeni seçim başlat
//   add     → Shift       mevcut seçime ekle
//   remove  → Ctrl/Cmd    mevcut seçimden çıkar
//
// Mimari kararlar:
//   - dragMode mousedown'da yakalanır ve dragModeRef'te saklanır
//     (drag sırasında kullanıcı tuşu bıraksa bile mod değişmez)
//   - mousemove + mouseup window listener — mouse stage dışına çıksa da çalışır
//   - Tüm store okumaları mouseup'ta getState() ile yapılır (stale closure yok)
//
// useDragMove ile çakışma yok:
//   RowShape.handleMouseDown → e.cancelBubble=true → stage'e propagate etmez
//   Bu hook sadece stage (boş alan) mousedown'da aktif olur

import { useState, useRef, useCallback, useEffect } from 'react'
import type Konva from 'konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import { useEditorStore } from '@/store/editor.store'
import { computeCurvedSeatPositions } from '@/lib/geometry'
import { SEAT_RADIUS } from '@/lib/constants'
import { setResizeDragging } from '@/hooks/useSelectTool'
import type { Row, Point } from '@/store/types'

// Sürükleme için minimum piksel eşiği — yanlışlıkla marquee başlamasın
const DRAG_THRESHOLD = 5

// ─── Tipler ─────────────────────────────────────────────────────────────────

export type MarqueeDragMode = 'normal' | 'add' | 'remove'

export interface MarqueeRectType {
  x:      number
  y:      number
  width:  number
  height: number
}

// ─── Yardımcı Fonksiyonlar ──────────────────────────────────────────────────

/**
 * Row'un dünya koordinatlarındaki bounding box'ını hesaplar.
 * Curved row'larda tüm koltuk pozisyonları dönüştürülür.
 */
function getRowWorldBBox(row: Row): MarqueeRectType {
  const positions = computeCurvedSeatPositions(row.seats.length, row.seatSpacing, row.curve)

  if (positions.length === 0) return { x: row.x, y: row.y, width: 0, height: 0 }

  const rad = row.rotation * (Math.PI / 180)
  let minX = Infinity, maxX = -Infinity
  let minY = Infinity, maxY = -Infinity

  for (const pos of positions) {
    const wx = row.x + Math.cos(rad) * pos.x - Math.sin(rad) * pos.y
    const wy = row.y + Math.sin(rad) * pos.x + Math.cos(rad) * pos.y
    minX = Math.min(minX, wx - SEAT_RADIUS)
    maxX = Math.max(maxX, wx + SEAT_RADIUS)
    minY = Math.min(minY, wy - SEAT_RADIUS)
    maxY = Math.max(maxY, wy + SEAT_RADIUS)
  }

  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
}

/** İki dikdörtgenin kesişip kesişmediğini kontrol eder */
function rectsIntersect(a: MarqueeRectType, b: MarqueeRectType): boolean {
  return (
    a.x           < b.x + b.width  &&
    a.x + a.width > b.x            &&
    a.y           < b.y + b.height &&
    a.y + a.height > b.y
  )
}

/**
 * Native mouse event'i canvas/dünya koordinatına çevirir.
 */
function clientToWorld(clientX: number, clientY: number, stage: Konva.Stage): Point {
  const box   = stage.container().getBoundingClientRect()
  const scale = stage.scaleX()
  return {
    x: (clientX - box.left - stage.x()) / scale,
    y: (clientY - box.top  - stage.y()) / scale,
  }
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useMarqueeSelect(stageRef: React.RefObject<Konva.Stage | null>) {
  const [marqueeRect, setMarqueeRect]   = useState<MarqueeRectType | null>(null)
  const [dragMode, setDragMode]         = useState<MarqueeDragMode>('normal')

  // Drag state — React state dışında tutulur, render tetiklemez
  const startPoint  = useRef<Point | null>(null)
  const currentRect = useRef<MarqueeRectType | null>(null)
  const isDrawing   = useRef(false)

  // dragMode mousedown'da belirlenir ve ref'te saklanır
  // drag sırasında tuş bırakılsa bile mod değişmez
  const dragModeRef = useRef<MarqueeDragMode>('normal')

  const activeTool = useEditorStore((s) => s.activeTool)

  // ─── Window listener ref'leri ─────────────────────────────────────────────

  const moveListenerRef = useRef<(e: MouseEvent) => void>(() => {})
  const upListenerRef   = useRef<(e: MouseEvent) => void>(() => {})

  // mousemove — threshold geçilince marquee rect'i günceller
  useEffect(() => {
    moveListenerRef.current = (e: MouseEvent) => {
      if (!startPoint.current) return
      const stage = stageRef.current
      if (!stage) return

      const pos = clientToWorld(e.clientX, e.clientY, stage)
      const dx  = pos.x - startPoint.current.x
      const dy  = pos.y - startPoint.current.y

      if (!isDrawing.current && Math.sqrt(dx * dx + dy * dy) < DRAG_THRESHOLD) return

      // İlk kez eşik geçildi — state'i güncelle (dragMode göstermek için)
      if (!isDrawing.current) {
        isDrawing.current = true
        setDragMode(dragModeRef.current)
      }

      const rect: MarqueeRectType = {
        x:      Math.min(startPoint.current.x, pos.x),
        y:      Math.min(startPoint.current.y, pos.y),
        width:  Math.abs(dx),
        height: Math.abs(dy),
      }

      currentRect.current = rect
      setMarqueeRect(rect)
    }
  })

  // mouseup — kesişen objeleri seçer / seçimden çıkarır, marquee'yi temizler
  useEffect(() => {
    upListenerRef.current = () => {
      if (!startPoint.current) return

      const wasDrawing    = isDrawing.current
      const mode          = dragModeRef.current

      // State sıfırla
      startPoint.current  = null
      isDrawing.current   = false
      dragModeRef.current = 'normal'

      setMarqueeRect(null)
      setDragMode('normal')

      if (!wasDrawing) {
        currentRect.current = null
        return
      }

      const rect = currentRect.current
      currentRect.current = null

      if (!rect) return

      // Drag bitti — sonraki click event'in seçimi silmesini engelle
      setResizeDragging(true)
      setTimeout(() => setResizeDragging(false), 0)

      // Güncel store snapshot — stale closure riski yok
      const state       = useEditorStore.getState()
      const activeFloor = state.chart?.floors.find((f) => f.id === state.activeFloorId) ?? null

      const rows = (activeFloor?.objects ?? []).filter(
        (o): o is Row => o.type === 'row' && o.isVisible,
      )

      const intersectingIds = rows
        .filter((row) => rectsIntersect(rect, getRowWorldBBox(row)))
        .map((row) => row.id)

      if (mode === 'add') {
        // Shift → mevcut seçime ekle, tekrarları önle
        if (intersectingIds.length === 0) return
        const merged = Array.from(new Set([...state.selectedObjectIds, ...intersectingIds]))
        state.selectObjects(merged)

      } else if (mode === 'remove') {
        // Ctrl → mevcut seçimden çıkar
        if (intersectingIds.length === 0) return
        const removeSet = new Set(intersectingIds)
        const filtered  = state.selectedObjectIds.filter((id) => !removeSet.has(id))
        state.selectObjects(filtered)

      } else {
        // Normal → seçimi tamamen yenile (boş marquee = seçim temizle)
        state.selectObjects(intersectingIds)
      }
    }
  })

  // Window listener'ları bir kez bağla
  useEffect(() => {
    const onMove = (e: MouseEvent) => moveListenerRef.current(e)
    const onUp   = (e: MouseEvent) => upListenerRef.current(e)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup',   onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup',   onUp)
    }
  }, [])

  // ─── Konva mousedown handler ──────────────────────────────────────────────

  /**
   * Stage boş alanına mousedown → marquee başlat.
   * Mod mousedown anında belirlenir — drag sırasında değişmez.
   */
  const handleMarqueeMouseDown = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      if (activeTool !== 'select') return
      const stage = stageRef.current
      if (!stage || e.target !== stage) return

      // Modu mousedown'da yakala
      const mode: MarqueeDragMode =
        e.evt.shiftKey                    ? 'add'    :
        (e.evt.ctrlKey || e.evt.metaKey)  ? 'remove' :
        'normal'

      dragModeRef.current = mode

      const pos = clientToWorld(e.evt.clientX, e.evt.clientY, stage)
      startPoint.current  = pos
      isDrawing.current   = false
      currentRect.current = null
    },
    [activeTool, stageRef],
  )

  return {
    marqueeRect,
    dragMode,
    handleMarqueeMouseDown,
  }
}