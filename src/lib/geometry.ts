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

// ─── Curve (Yay) Hesabı ──────────────────────────────────────────────────────
//
// Model: Simetrik dairesel yay
//
// Koordinat sistemi — Group yerel:
//   x = row'un uzandığı yön (0 → chord)
//   y = dik eksen (curve>0 → negatif y = yukarı büküm)
//
// curve: -100..100, 0 = düz çizgi, ±100 = maksimum yay
//
// Matematiksel model:
//   chord   = (seatCount - 1) * seatSpacing
//   sagitta = (curve / 100) * chord * 0.3
//   Daire merkezi O = (chord/2, (chord²/4 - s²) / (2s))
//   Yarıçap       R = sqrt((chord/2)² + O.y²)
//   θ_A = atan2(-O.y, -O.x), θ_B = atan2(-O.y, chord - O.x)
//   Koltuk i: (O.x + R·cos(θ_A + t·sweep), O.y + R·sin(θ_A + t·sweep))
//
// Sınır kontrolleri:
//   i=0       → (0, 0)      ✓
//   i=N-1     → (chord, 0)  ✓
//   i=mid     → (chord/2, -sagitta) ✓

export function computeCurvedSeatPositions(
  seatCount:   number,
  seatSpacing: number,
  curve:       number,   // -100..100
): Point[] {
  if (seatCount <= 1) return [{ x: 0, y: 0 }]

  const chord = (seatCount - 1) * seatSpacing

  // Düz çizgi
  if (Math.abs(curve) < 0.5 || chord < 1) {
    return Array.from({ length: seatCount }, (_, i) => ({
      x: i * seatSpacing,
      y: 0,
    }))
  }

  const sagitta = (curve / 100) * chord * 0.3

  // Daire merkezi
  const cx = chord / 2
  const cy = (chord * chord / 4 - sagitta * sagitta) / (2 * sagitta)
  const R  = Math.sqrt(cx * cx + cy * cy)

  const angleA = Math.atan2(0 - cy, 0 - cx)
  const angleB = Math.atan2(0 - cy, chord - cx)
  const sweep  = angleB - angleA

  return Array.from({ length: seatCount }, (_, i) => {
    const t     = seatCount === 1 ? 0 : i / (seatCount - 1)
    const theta = angleA + sweep * t
    return {
      x: cx + R * Math.cos(theta),
      y: cy + R * Math.sin(theta),
    }
  })
}