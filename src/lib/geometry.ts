// Canvas geometri yardımcı fonksiyonları

import type { Point } from '@/store/types'

export function distance(a: Point, b: Point): number {
  return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2)
}

export function angle(a: Point, b: Point): number {
  return Math.atan2(b.y - a.y, b.x - a.x)
}

// Koltukları start noktasından itibaren diz — ilk koltuk her zaman start'ta
export function calcSeatPositions(
  start:       Point,
  end:         Point,
  seatSpacing: number,
): Point[] {
  const dist  = distance(start, end)
  const count = Math.max(1, Math.floor(dist / seatSpacing) + 1)
  const theta = angle(start, end)

  return Array.from({ length: count }, (_, i) => ({
    x: start.x + Math.cos(theta) * i * seatSpacing,
    y: start.y + Math.sin(theta) * i * seatSpacing,
  }))
}

export function calcSeatCount(start: Point, end: Point, seatSpacing: number): number {
  return Math.max(1, Math.floor(distance(start, end) / seatSpacing) + 1)
}

// Screen → canvas dünya koordinatı
export function screenToCanvas(point: Point, stageX: number, stageY: number, scale: number): Point {
  return {
    x: (point.x - stageX) / scale,
    y: (point.y - stageY) / scale,
  }
}

export function snapToGrid(point: Point, cellSize: number): Point {
  return {
    x: Math.round(point.x / cellSize) * cellSize,
    y: Math.round(point.y / cellSize) * cellSize,
  }
}