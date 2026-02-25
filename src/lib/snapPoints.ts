// Snap noktası hesaplama
// Her koltuk için 8 yön + row başlangıç/bitiş noktaları
// Snap noktaları dünya koordinatında hesaplanır

import type { Point, Row } from '@/store/types'
import { DEFAULT_ROW_SPACING, SEAT_RADIUS } from '@/lib/constants'

export type SnapDirection =
  | 'top-left' | 'top' | 'top-right'
  | 'left'     |         'right'
  | 'bottom-left' | 'bottom' | 'bottom-right'
  | 'center'
  | 'row-start' | 'row-end'

export interface SnapPoint {
  x:          number
  y:          number
  direction:  SnapDirection
  sourceId:   string   // Hangi koltuğa veya row'a ait
  seatX:      number   // Highlight için kaynak koltuk merkezi
  seatY:      number
}

// Koltuk merkezine göre 8 yön + merkez snap noktaları
const DIRECTIONS: { dir: SnapDirection; dx: number; dy: number }[] = [
  { dir: 'top-left',     dx: -1,  dy: -1 },
  { dir: 'top',          dx:  0,  dy: -1 },
  { dir: 'top-right',    dx:  1,  dy: -1 },
  { dir: 'left',         dx: -1,  dy:  0 },
  { dir: 'right',        dx:  1,  dy:  0 },
  { dir: 'bottom-left',  dx: -1,  dy:  1 },
  { dir: 'bottom',       dx:  0,  dy:  1 },
  { dir: 'bottom-right', dx:  1,  dy:  1 },
  { dir: 'center',       dx:  0,  dy:  0 },
]

// Row açısına göre koltuk dünya koordinatını hesapla
function getSeatWorldPos(row: Row, seatIndex: number): Point {
  const rad = row.rotation * (Math.PI / 180)
  return {
    x: row.x + Math.cos(rad) * seatIndex * row.seatSpacing,
    y: row.y + Math.sin(rad) * seatIndex * row.seatSpacing,
  }
}

// Tüm row'lardan snap noktalarını topla
export function collectSnapPoints(rows: Row[]): SnapPoint[] {
  const points: SnapPoint[] = []
  const spacing = DEFAULT_ROW_SPACING   // Snap noktası koltuktan bu kadar uzakta

  for (const row of rows) {
    for (let i = 0; i < row.seats.length; i++) {
      const world = getSeatWorldPos(row, i)

      // 8 yön snap noktaları
      for (const { dir, dx, dy } of DIRECTIONS) {
        points.push({
          x:         world.x + dx * spacing * 2,
          y:         world.y + dy * spacing * 2,
          direction: dir,
          sourceId:  row.seats[i].id,
          seatX:     world.x,
          seatY:     world.y,
        })
      }
    }

    // Row başlangıç noktası
    points.push({
      x:         row.x,
      y:         row.y,
      direction: 'row-start',
      sourceId:  row.id,
      seatX:     row.x,
      seatY:     row.y,
    })

    // Row bitiş noktası
    if (row.seats.length > 0) {
      const lastWorld = getSeatWorldPos(row, row.seats.length - 1)
      points.push({
        x:         lastWorld.x,
        y:         lastWorld.y,
        direction: 'row-end',
        sourceId:  row.id,
        seatX:     lastWorld.x,
        seatY:     lastWorld.y,
      })
    }
  }

  return points
}

// Cursor'a en yakın snap noktasını bul
export function findNearestSnapPoint(
  cursor:    Point,
  points:    SnapPoint[],
  threshold: number,   // Bu mesafe içindeyse snap et
): SnapPoint | null {
  let nearest:  SnapPoint | null = null
  let minDist   = threshold

  for (const sp of points) {
    const dist = Math.sqrt((cursor.x - sp.x) ** 2 + (cursor.y - sp.y) ** 2)
    if (dist < minDist) {
      minDist = dist
      nearest = sp
    }
  }

  return nearest
}

// İki koltuk arasındaki orta snap noktasını bul (yan yana iki koltuk ortası)
export function findMidpointSnapPoints(rows: Row[]): SnapPoint[] {
  const midpoints: SnapPoint[] = []

  for (const row of rows) {
    for (let i = 0; i < row.seats.length - 1; i++) {
      const a = getSeatWorldPos(row, i)
      const b = getSeatWorldPos(row, i + 1)
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }

      // Ortanın üst ve altına snap noktası
      const rad     = row.rotation * (Math.PI / 180)
      const perpRad = rad + Math.PI / 2
      const offset  = SEAT_RADIUS * 2.5

      midpoints.push(
        {
          x: mid.x + Math.cos(perpRad) * offset,
          y: mid.y + Math.sin(perpRad) * offset,
          direction: 'top',
          sourceId:  `${row.seats[i].id}-${row.seats[i + 1].id}-mid`,
          seatX:     mid.x,
          seatY:     mid.y,
        },
        {
          x: mid.x - Math.cos(perpRad) * offset,
          y: mid.y - Math.sin(perpRad) * offset,
          direction: 'bottom',
          sourceId:  `${row.seats[i].id}-${row.seats[i + 1].id}-mid`,
          seatX:     mid.x,
          seatY:     mid.y,
        },
      )
    }
  }

  return midpoints
}

// Row spacing snap noktaları
// Her row'un dik yönünde rowSpacing mesafesinde snap noktaları üretir
// Yeni row çizilirken bu mesafede cursor snap olur
export function collectRowSpacingSnapPoints(rows: Row[], rowSpacing: number): SnapPoint[] {
  const points: SnapPoint[] = []

  for (const row of rows) {
    if (row.seats.length === 0) continue

    const rad      = row.rotation * (Math.PI / 180)
    const perpRad  = rad + Math.PI / 2

    // Row'un üst ve alt tarafında rowSpacing mesafede snap noktaları
    for (const dir of [1, -1]) {
      // Her koltuk için dik snap noktası
      for (let i = 0; i < row.seats.length; i++) {
        const world = getSeatWorldPos(row, i)
        points.push({
          x:         world.x + Math.cos(perpRad) * rowSpacing * dir,
          y:         world.y + Math.sin(perpRad) * rowSpacing * dir,
          direction: dir === 1 ? 'top' : 'bottom',
          sourceId:  `${row.id}-rowspacing-${i}-${dir}`,
          seatX:     world.x,
          seatY:     world.y,
        })
      }
    }
  }

  return points
}