'use client'

// Canvas sol alt kontroller — drag-based joystick + zoom butonları
// Joystick: thumb sürükle, yön ve hıza göre canvas pan olur, bırakınca merkeze döner

import { useRef, useCallback, useEffect } from 'react'
import type Konva from 'konva'
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';

const JOYSTICK_RADIUS = 32
const THUMB_RADIUS = 20
const MAX_OFFSET = JOYSTICK_RADIUS - THUMB_RADIUS
const PAN_MULTIPLIER = 0.8 // Pan hızını ayarlar

interface CanvasControlsProps {
  stageRef: React.RefObject<Konva.Stage | null>
  onZoomIn: () => void
  onZoomOut: () => void
}

export default function CanvasControls({ stageRef, onZoomIn, onZoomOut }: CanvasControlsProps) {
  const thumbRef = useRef<HTMLDivElement>(null)
  const animFrameRef = useRef<number | null>(null)
  const offsetRef = useRef({ x: 0, y: 0 })
  const isDraggingRef = useRef(false)
  const originRef = useRef({ x: 0, y: 0 })

  // panLoop ref olarak tanımla — hoisting sorununu çözer
  const panLoopRef = useRef<() => void>(() => { })

  panLoopRef.current = () => {
    const stage = stageRef.current
    const { x, y } = offsetRef.current

    if (stage && (x !== 0 || y !== 0)) {
      stage.position({
        x: stage.x() - x * PAN_MULTIPLIER,
        y: stage.y() - y * PAN_MULTIPLIER,
      })
      stage.fire('xChange')
    }

    animFrameRef.current = requestAnimationFrame(panLoopRef.current)
  }

  const moveThumb = useCallback((dx: number, dy: number) => {
    const dist = Math.sqrt(dx * dx + dy * dy)
    const clamped = Math.min(dist, MAX_OFFSET)
    const angle = Math.atan2(dy, dx)
    const clampedX = Math.cos(angle) * clamped
    const clampedY = Math.sin(angle) * clamped

    offsetRef.current = { x: clampedX, y: clampedY }

    if (thumbRef.current) {
      thumbRef.current.style.transform =
        `translate(calc(-50% + ${clampedX}px), calc(-50% + ${clampedY}px))`
    }
  }, [])

  const resetThumb = useCallback(() => {
    offsetRef.current = { x: 0, y: 0 }
    if (thumbRef.current) {
      thumbRef.current.style.transform = 'translate(-50%, -50%)'
    }
  }, [])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    isDraggingRef.current = true
    originRef.current = { x: e.clientX, y: e.clientY }
    animFrameRef.current = requestAnimationFrame(panLoopRef.current)
  }, [])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDraggingRef.current) return
    moveThumb(
      e.clientX - originRef.current.x,
      e.clientY - originRef.current.y,
    )
  }, [moveThumb])

  const handlePointerUp = useCallback(() => {
    isDraggingRef.current = false
    resetThumb()
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current)
      animFrameRef.current = null
    }
  }, [resetThumb])

  useEffect(() => {
    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current)
      }
    }
  }, [])

  return (
    <div className="absolute bottom-4 left-4 flex flex-col items-center gap-2 select-none">

      {/* Joystick */}
      <div
        className="relative rounded-full bg-surface-2/80 border border-border backdrop-blur-sm cursor-grab active:cursor-grabbing touch-none"
        style={{ width: JOYSTICK_RADIUS * 2, height: JOYSTICK_RADIUS * 2 }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {/* Merkez nokta */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-1 h-1 rounded-full bg-border opacity-60" />
        </div>

        {/* Thumb */}
        <div
          ref={thumbRef}
          className="absolute top-1/2 left-1/2 rounded-full bg-white/60 border border-border pointer-events-none"
          style={{
            width: THUMB_RADIUS * 2,
            height: THUMB_RADIUS * 2,
            transform: 'translate(-50%, -50%)',
          }}
        />
      </div>

      {/* Zoom butonları */}
      <div className="flex items-center gap-1">
        <button
          onClick={onZoomOut}
          aria-label="Zoom out"
          className="w-7 h-7 flex items-center justify-center rounded bg-surface-2/80 border border-border backdrop-blur-sm text-text text-base font-bold cursor-pointer hover:bg-surface transition-colors duration-150"
        >
          <RemoveIcon fontSize="small" />
        </button>
        <button
          onClick={onZoomIn}
          aria-label="Zoom in"
          className="w-7 h-7 flex items-center justify-center rounded bg-surface-2/80 border border-border backdrop-blur-sm text-text text-base font-bold cursor-pointer hover:bg-surface transition-colors duration-150"
        >
          <AddIcon fontSize="small" />
        </button>
      </div>

    </div>
  )
}