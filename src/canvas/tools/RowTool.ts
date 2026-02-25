// Row Tool state machine
// idle:    cursor preview
// drawing: start'tan cursor'a preview, shift basılıysa 15° katlarına snap

import { nanoid } from 'nanoid'
import { angle, calcSeatCount, calcSeatPositions } from '@/lib/geometry'
import type { Point, Row, Seat } from '@/store/types'
import { DEFAULT_SEAT_SPACING } from '@/lib/constants'

export type RowToolStep = 'idle' | 'drawing'

export interface RowToolState {
  step:          RowToolStep
  startPoint:    Point | null
  cursorPoint:   Point | null   // Ham cursor — snap uygulanmamış
  snappedEnd:    Point | null   // Açı snap uygulanmış bitiş noktası
  seatCount:     number
  angleDeg:      number         // Anlık açı — preview göstergesi için
  isAngleSnapped: boolean       // Shift basılıyken true
}

export const initialRowToolState: RowToolState = {
  step:           'idle',
  startPoint:     null,
  cursorPoint:    null,
  snappedEnd:     null,
  seatCount:      1,
  angleDeg:       0,
  isAngleSnapped: false,
}

const ANGLE_SNAP_STEP = 15   // Derece

// Açıyı en yakın 15° katına snap et, aynı mesafeyi koru
export function snapAngle(start: Point, end: Point): Point {
  const dist       = Math.sqrt((end.x - start.x) ** 2 + (end.y - start.y) ** 2)
  const rawAngle   = angle(start, end) * (180 / Math.PI)
  const snapped    = Math.round(rawAngle / ANGLE_SNAP_STEP) * ANGLE_SNAP_STEP
  const snappedRad = snapped * (Math.PI / 180)

  return {
    x: start.x + Math.cos(snappedRad) * dist,
    y: start.y + Math.sin(snappedRad) * dist,
  }
}

export function handleRowToolClick(
  state:       RowToolState,
  point:       Point,
  shiftKey:    boolean,
  floorId:     string,
  sectionId:   string | null,
  seatSpacing: number = DEFAULT_SEAT_SPACING,
): { nextState: RowToolState; newRow: Row | null } {
  if (state.step === 'idle') {
    return {
      nextState: {
        ...initialRowToolState,
        step:        'drawing',
        startPoint:  point,
        cursorPoint: point,
        snappedEnd:  point,
      },
      newRow: null,
    }
  }

  if (state.step === 'drawing' && state.startPoint && state.snappedEnd) {
    const end = state.snappedEnd
    if (state.startPoint.x === end.x && state.startPoint.y === end.y) {
      return { nextState: initialRowToolState, newRow: null }
    }
    return {
      nextState: initialRowToolState,
      newRow:    buildRow(state.startPoint, end, floorId, sectionId, seatSpacing),
    }
  }

  return { nextState: state, newRow: null }
}

export function handleRowToolMouseMove(
  state:       RowToolState,
  point:       Point,
  shiftKey:    boolean,
  seatSpacing: number = DEFAULT_SEAT_SPACING,
): RowToolState {
  if (state.step === 'idle') {
    return { ...state, cursorPoint: point, snappedEnd: point }
  }

  if (state.step === 'drawing' && state.startPoint) {
    const snappedEnd    = shiftKey ? snapAngle(state.startPoint, point) : point
    const rawAngleDeg   = angle(state.startPoint, snappedEnd) * (180 / Math.PI)
    const normalizedDeg = ((rawAngleDeg % 360) + 360) % 360

    return {
      ...state,
      cursorPoint:    point,
      snappedEnd,
      seatCount:      calcSeatCount(state.startPoint, snappedEnd, seatSpacing),
      angleDeg:       Math.round(normalizedDeg),
      isAngleSnapped: shiftKey,
    }
  }

  return state
}

function buildRow(
  start:       Point,
  end:         Point,
  floorId:     string,
  sectionId:   string | null,
  seatSpacing: number = DEFAULT_SEAT_SPACING,
): Row {
  const rowId       = nanoid()
  const rotationDeg = angle(start, end) * (180 / Math.PI)
  const positions   = calcSeatPositions(start, end, seatSpacing)

  const seats: Seat[] = positions.map((_, i) => ({
    id:             nanoid(),
    rowId,
    index:          i,
    label:          String(i + 1),
    categoryId:     null,
    accessible:     false,
    restrictedView: false,
    isAvailable:    true,
  }))

  return {
    id:          rowId,
    type:        'row',
    floorId,
    sectionId,
    label:       '',
    seats,
    x:           start.x,
    y:           start.y,
    rotation:    rotationDeg,
    curve:       0,
    seatSpacing,
    isVisible:   true,
    isLocked:    false,
  }
}