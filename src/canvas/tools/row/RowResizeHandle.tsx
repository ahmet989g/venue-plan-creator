'use client'

// Row resize handle — sol ve sağ uçta koltuk ekleme/çıkarma
// Native window event ile drag — Konva draggable kullanılmaz (remount drag'i keser)
// Callback'ler ref'te tutulur — stale closure ve circular dependency olmaz

import { useRef, useCallback, useEffect, useState } from 'react'
import { Group, Rect, Text } from 'react-konva'
import type Konva from 'konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import { useShallow } from 'zustand/react/shallow'
import { useEditorStore } from '@/store/editor.store'
import { setResizeDragging } from '@/hooks/canvas/useSelectTool'
import { nanoid } from 'nanoid'
import { DEFAULT_SEAT_SPACING, SEAT_RADIUS } from '@/lib/constants'
import type { Row, Seat } from '@/store/types'

const HANDLE_SIZE = SEAT_RADIUS * 1.0   // Küçük kare
const HANDLE_COLOR = '#f78166'
const HANDLE_STROKE = '#ffffff'

interface RowResizeHandleProps {
  row: Row
  side: 'left' | 'right'
  selectedRows: Row[]
  stageRef: React.RefObject<Konva.Stage | null>
}

function getSeatWorld(row: Row, index: number) {
  const rad = row.rotation * (Math.PI / 180)
  return {
    x: row.x + Math.cos(rad) * index * row.seatSpacing,
    y: row.y + Math.sin(rad) * index * row.seatSpacing,
  }
}

function getHandleCenter(row: Row, side: 'left' | 'right') {
  const isLeft = side === 'left'
  const seatIdx = isLeft ? 0 : row.seats.length - 1
  const world = getSeatWorld(row, seatIdx)
  const rad = row.rotation * (Math.PI / 180)
  const dir = isLeft ? -1 : 1
  // Transformer padding=0 — kenar tam koltuk merkezinde SEAT_RADIUS kadar dışarıda
  // Handle transformer kenarına (SEAT_RADIUS) tam yapışık
  const dist = SEAT_RADIUS + HANDLE_SIZE / 2
  return {
    x: world.x + Math.cos(rad) * dir * dist,
    y: world.y + Math.sin(rad) * dir * dist,
    seatX: world.x,
    seatY: world.y,
  }
}

export default function RowResizeHandle({ row, side, selectedRows, stageRef }: RowResizeHandleProps) {
  const { updateObject, pushHistory } = useEditorStore(
    useShallow((s) => ({
      updateObject: s.updateObject,
      pushHistory: s.pushHistory,
    })),
  )

  const isLeft = side === 'left'
  const isDragging = useRef(false)
  const [dragSeatCount, setDragSeatCount] = useState<number | null>(null)

  const dragStart = useRef({
    pointerX: 0,
    pointerY: 0,
    originalCounts: new Map<string, number>(),
  })

  // Güncel prop'lara her zaman erişmek için ref — stale closure olmaz
  const propsRef = useRef({ row, selectedRows, updateObject, pushHistory, isLeft, stageRef, setDragSeatCount })
  useEffect(() => {
    propsRef.current = { row, selectedRows, updateObject, pushHistory, isLeft, stageRef, setDragSeatCount }
  })

  // Stable listener ref'leri — bir kez oluşturulur, unmount'a kadar aynı referans kalır
  const moveListenerRef = useRef<(e: MouseEvent) => void>(() => { })
  const upListenerRef = useRef<(e: MouseEvent) => void>(() => { })

  // Mount'ta stable listener'ları oluştur
  useEffect(() => {
    moveListenerRef.current = (e: MouseEvent) => {
      if (!isDragging.current) return
      const { row: r, selectedRows: rows, updateObject: upd, isLeft: left, stageRef: sr, setDragSeatCount: setCount } = propsRef.current

      const stage = sr.current
      if (!stage) return

      const scale = stage.scaleX()
      const dxWorld = (e.clientX - dragStart.current.pointerX) / scale
      const dyWorld = (e.clientY - dragStart.current.pointerY) / scale

      const rad = r.rotation * (Math.PI / 180)
      const projection = dxWorld * Math.cos(rad) + dyWorld * Math.sin(rad)
      const seatDelta = Math.round(projection / DEFAULT_SEAT_SPACING) * (left ? -1 : 1)

      let lastCount = 0
      for (const row of rows) {
        const orig = dragStart.current.originalCounts.get(row.id) ?? row.seats.length
        const newCount = Math.max(1, orig + seatDelta)
        lastCount = newCount
        applyRowResize(row, newCount, left, upd)
      }
      setCount(lastCount)
    }

    upListenerRef.current = (e: MouseEvent) => {
      if (!isDragging.current) return
      e.stopPropagation()
      isDragging.current = false
      setResizeDragging(false)

      const { stageRef: sr, pushHistory: ph, setDragSeatCount: setCount } = propsRef.current
      const container = sr.current?.container()
      if (container) container.style.cursor = 'default'
      setCount(null)
      ph()

      if (moveListenerRef.current) window.removeEventListener('mousemove', moveListenerRef.current)
      if (upListenerRef.current) window.removeEventListener('mouseup', upListenerRef.current)
    }

    // Unmount'ta temizle
    return () => {
      if (moveListenerRef.current) window.removeEventListener('mousemove', moveListenerRef.current)
      if (upListenerRef.current) window.removeEventListener('mouseup', upListenerRef.current)
    }
  }, []) // Sadece mount/unmount — listener içi prop'lar propsRef'ten alınır

  const handleMouseDown = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      e.cancelBubble = true
      e.evt.preventDefault()

      isDragging.current = true
      setResizeDragging(true)

      const counts = new Map<string, number>()
      for (const r of selectedRows) counts.set(r.id, r.seats.length)

      dragStart.current = {
        pointerX: e.evt.clientX,
        pointerY: e.evt.clientY,
        originalCounts: counts,
      }

      const container = stageRef.current?.container()
      if (container) container.style.cursor = 'ew-resize'

      if (moveListenerRef.current) window.addEventListener('mousemove', moveListenerRef.current)
      if (upListenerRef.current) window.addEventListener('mouseup', upListenerRef.current)
    },
    [selectedRows, stageRef],
  )

  const hc = getHandleCenter(row, side)

  // Row ortası — etiket buraya konumlanır
  const rowMidIdx = Math.floor(row.seats.length / 2)
  const rowMid = getSeatWorld(row, rowMidIdx)
  const rad = row.rotation * (Math.PI / 180)
  const labelText = String(dragSeatCount ?? row.seats.length)
  const fontSize = 11
  const padding = 5
  const labelW = labelText.length * fontSize * 0.65 + padding * 2
  const labelH = fontSize + padding * 2
  // Etiketi row'a dik yönde yukarı offset
  const perpX = -Math.sin(rad) * (SEAT_RADIUS * 2.8 + labelH / 2)
  const perpY = Math.cos(rad) * (SEAT_RADIUS * 2.8 + labelH / 2)

  return (
    <Group>
      {/* Küçük kare handle */}
      <Rect
        x={hc.x - HANDLE_SIZE / 2}
        y={hc.y - HANDLE_SIZE / 2}
        width={HANDLE_SIZE}
        height={HANDLE_SIZE}
        fill={HANDLE_COLOR}
        stroke={HANDLE_STROKE}
        strokeWidth={1}
        cornerRadius={1}
        onMouseDown={handleMouseDown}
        onMouseEnter={(e) => {
          const stage = e.target.getStage()
          if (stage) stage.container().style.cursor = 'ew-resize'
        }}
        onMouseLeave={(e) => {
          if (isDragging.current) return
          const stage = e.target.getStage()
          if (stage) stage.container().style.cursor = 'default'
        }}
        perfectDrawEnabled={false}
      />

      {/* Drag sırasında row ortasında adet etiketi — sadece sağ handle render eder */}
      {dragSeatCount !== null && (
        <Group x={rowMid.x + perpX} y={rowMid.y}>
          <Rect
            x={-labelW / 2}
            y={-labelH / 2}
            width={labelW}
            height={labelH}
            fill="rgba(0,0,0,0.65)"
            cornerRadius={3}
            perfectDrawEnabled={false}
          />
          <Text
            text={labelText}
            fontSize={fontSize}
            fill="rgba(255,255,255,0.9)"
            fontStyle="bold"
            align="center"
            verticalAlign="middle"
            width={labelW}
            height={labelH}
            offsetX={labelW / 2}
            offsetY={labelH / 2}
            perfectDrawEnabled={false}
          />
        </Group>
      )}
    </Group>
  )
}

function applyRowResize(
  row: Row,
  newCount: number,
  fromLeft: boolean,
  updateObject: (id: string, patch: Partial<Row>) => void,
) {
  const current = row.seats.length
  if (newCount === current) return

  const rad = row.rotation * (Math.PI / 180)

  if (newCount > current) {
    const add = newCount - current
    if (fromLeft) {
      const newX = row.x - Math.cos(rad) * add * row.seatSpacing
      const newY = row.y - Math.sin(rad) * add * row.seatSpacing
      const extra = Array.from({ length: add }, (_, i) => makeSeat(row.id, i))
      const merged = [...extra, ...row.seats].map((s, i) => ({ ...s, index: i, label: String(i + 1) }))
      updateObject(row.id, { seats: merged, x: newX, y: newY })
    } else {
      const extra = Array.from({ length: add }, (_, i) => makeSeat(row.id, current + i))
      const merged = [...row.seats, ...extra].map((s, i) => ({ ...s, index: i, label: String(i + 1) }))
      updateObject(row.id, { seats: merged })
    }
  } else {
    const remove = current - newCount
    if (fromLeft) {
      const newX = row.x + Math.cos(rad) * remove * row.seatSpacing
      const newY = row.y + Math.sin(rad) * remove * row.seatSpacing
      const trimmed = row.seats.slice(remove).map((s, i) => ({ ...s, index: i, label: String(i + 1) }))
      updateObject(row.id, { seats: trimmed, x: newX, y: newY })
    } else {
      const trimmed = row.seats.slice(0, newCount).map((s, i) => ({ ...s, index: i, label: String(i + 1) }))
      updateObject(row.id, { seats: trimmed })
    }
  }
}

function makeSeat(rowId: string, index: number): Seat {
  return {
    id: nanoid(),
    rowId,
    index,
    label: String(index + 1),
    categoryIds: [],      // Önceki: categoryId: null
    accessible: false,
    restrictedView: false,
    isAvailable: true,
  }
}