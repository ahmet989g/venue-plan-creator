'use client'

// Canvas grid katmanı — HTML Canvas 2D API ile çizilir
// Konva layer kullanılmaz — stage event bağımlılığı yok, daha performanslı
// Tema uyumlu renk, adaptive density

import { useRef, useEffect } from 'react'
import type Konva from 'konva'
import { useIsGridVisible } from '@/store/editor.store'
import { GRID_THRESHOLDS } from '@/lib/constants'

interface GridLayerProps {
  stageRef: React.RefObject<Konva.Stage | null>
  width: number
  height: number
  isDark: boolean
}

function getCellSize(scale: number): number {
  if (GRID_THRESHOLDS.dense * scale >= 20) return GRID_THRESHOLDS.dense
  if (GRID_THRESHOLDS.normal * scale >= 20) return GRID_THRESHOLDS.normal
  return GRID_THRESHOLDS.sparse
}

function drawGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  stageX: number,
  stageY: number,
  scale: number,
  color: string,
) {
  ctx.clearRect(0, 0, width, height)

  const cellSize = getCellSize(scale)
  const startX = ((stageX % (cellSize * scale)) + (cellSize * scale)) % (cellSize * scale)
  const startY = ((stageY % (cellSize * scale)) + (cellSize * scale)) % (cellSize * scale)

  ctx.beginPath()
  ctx.strokeStyle = color
  ctx.lineWidth = 1

  for (let x = startX; x < width; x += cellSize * scale) {
    ctx.moveTo(x, 0)
    ctx.lineTo(x, height)
  }
  for (let y = startY; y < height; y += cellSize * scale) {
    ctx.moveTo(0, y)
    ctx.lineTo(width, y)
  }

  ctx.stroke()
}

export default function GridLayer({ stageRef, width, height, isDark }: GridLayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isGridVisible = useIsGridVisible()

  const color = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.09)'

  useEffect(() => {
    const canvas = canvasRef.current
    const stage = stageRef.current
    if (!canvas || !stage || !isGridVisible) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // İlk çizim
    drawGrid(ctx, width, height, stage.x(), stage.y(), stage.scaleX(), color)

    // Stage pozisyon/scale değişimlerini dinle
    const update = () => {
      drawGrid(ctx, width, height, stage.x(), stage.y(), stage.scaleX(), color)
    }

    stage.on('xChange yChange scaleXChange', update)
    return () => {
      stage.off('xChange yChange scaleXChange', update)
    }
  }, [stageRef, width, height, color, isGridVisible])

  // Grid kapalıysa canvas'ı temizle
  useEffect(() => {
    if (!isGridVisible) {
      const ctx = canvasRef.current?.getContext('2d')
      if (ctx) ctx.clearRect(0, 0, width, height)
    }
  }, [isGridVisible, width, height])

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="absolute inset-0 pointer-events-none"
    />
  )
}