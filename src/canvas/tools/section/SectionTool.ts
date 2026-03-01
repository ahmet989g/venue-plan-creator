// Section Tool — saf state machine (UI bağımlılığı yok)
//
// İki mod:
//   polygon  → tıkla nokta ekle, ilk noktaya tıkla veya Dbl Click → kapat
//              Shift basılı → son noktadan 15° katlarına snap
//   rect     → mousedown drag mouseup → dikdörtgen
//              Shift basılı → kare zorla
//
// Kapatma eşiği: CLOSE_THRESHOLD px (dünya koordinatı)

import { nanoid } from 'nanoid'
import type { Point, Section } from '@/store/types'

// ─── Sabitler ────────────────────────────────────────────────────────────────

export const CLOSE_THRESHOLD   = 16   // İlk noktaya bu mesafede kapanır (dünya px)
export const MIN_POLYGON_POINTS = 3   // Minimum köşe sayısı
export const ANGLE_SNAP_STEP   = 15   // Shift snap — derece cinsinden

// ─── Tipler ──────────────────────────────────────────────────────────────────

export type SectionToolMode = 'polygon' | 'rect'

export interface PolygonToolState {
  mode:           'polygon'
  step:           'idle' | 'drawing'
  points:         Point[]       // Tamamlanmış köşe noktaları
  cursor:         Point | null  // Anlık cursor pozisyonu — önizleme için
  snappedCursor:  Point | null  // Shift snap uygulanmış cursor
  isClosable:     boolean       // Cursor ilk noktaya yakın mı?
  isShiftSnapped: boolean       // Shift ile açı snap aktif mi?
}

export interface RectToolState {
  mode:           'rect'
  step:           'idle' | 'drawing'
  startPoint:     Point | null
  cursor:         Point | null
  isShiftSnapped: boolean       // Shift ile kare zorlandı mı?
}

export type SectionToolState = PolygonToolState | RectToolState

// ─── Initial States ───────────────────────────────────────────────────────────

export const initialPolygonState: PolygonToolState = {
  mode:           'polygon',
  step:           'idle',
  points:         [],
  cursor:         null,
  snappedCursor:  null,
  isClosable:     false,
  isShiftSnapped: false,
}

export const initialRectState: RectToolState = {
  mode:           'rect',
  step:           'idle',
  startPoint:     null,
  cursor:         null,
  isShiftSnapped: false,
}

// ─── Yardımcı ────────────────────────────────────────────────────────────────

export function dist(a: Point, b: Point): number {
  return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2)
}

/**
 * Son noktadan cursor'a olan açıyı 15° katlarına snap et
 * Mesafe korunur, sadece açı değişir
 */
export function snapAngleFromPoint(origin: Point, cursor: Point): Point {
  const dx       = cursor.x - origin.x
  const dy       = cursor.y - origin.y
  const distance = Math.sqrt(dx * dx + dy * dy)
  if (distance < 1) return cursor

  const rawDeg     = Math.atan2(dy, dx) * (180 / Math.PI)
  const snappedDeg = Math.round(rawDeg / ANGLE_SNAP_STEP) * ANGLE_SNAP_STEP
  const snappedRad = snappedDeg * (Math.PI / 180)

  return {
    x: origin.x + Math.cos(snappedRad) * distance,
    y: origin.y + Math.sin(snappedRad) * distance,
  }
}

/** Polygon points'ten Section objesi oluştur */
export function buildPolygonSection(
  points:  Point[],
  floorId: string,
  order:   number,
): Section {
  return {
    id:        nanoid(),
    floorId,
    label:     '',
    color:     '#f78166',
    shape:     'polygon',
    points,
    isVisible: true,
    isLocked:  false,
    zoomable:  true,
    order,
    objectIds: [],
    labelX:    50,
    labelY:    50,
  }
}

/** Start + end'den dikdörtgen Section objesi oluştur */
export function buildRectSection(
  start:   Point,
  end:     Point,
  floorId: string,
  order:   number,
): Section {
  const x      = Math.min(start.x, end.x)
  const y      = Math.min(start.y, end.y)
  const width  = Math.abs(end.x - start.x)
  const height = Math.abs(end.y - start.y)

  return {
    id:        nanoid(),
    floorId,
    label:     '',
    color:     '#f78166',
    shape:     'rect',
    x,
    y,
    width,
    height,
    isVisible: true,
    isLocked:  false,
    zoomable:  true,
    order,
    objectIds: [],
    labelX:    50,
    labelY:    50,
  }
}

// ─── Polygon Handler'lar ──────────────────────────────────────────────────────

export function handlePolygonClick(
  state:    PolygonToolState,
  rawPoint: Point,
  shiftKey: boolean,
  floorId:  string,
  order:    number,
): { nextState: PolygonToolState; newSection: Section | null } {
  // Shift snap uygula — son noktadan açı kısıtla
  const lastPt = state.points[state.points.length - 1]
  const point  = (shiftKey && lastPt)
    ? snapAngleFromPoint(lastPt, rawPoint)
    : rawPoint

  // idle → ilk nokta (shift snap uygulanmaz — referans noktası yok)
  if (state.step === 'idle') {
    return {
      nextState: {
        ...initialPolygonState,
        step:          'drawing',
        points:        [rawPoint],
        cursor:        rawPoint,
        snappedCursor: rawPoint,
      },
      newSection: null,
    }
  }

  // drawing
  if (state.step === 'drawing') {
    const first = state.points[0]

    // İlk noktaya yeterince yakın → kapat
    if (first && state.isClosable && state.points.length >= MIN_POLYGON_POINTS) {
      return {
        nextState:  initialPolygonState,
        newSection: buildPolygonSection(state.points, floorId, order),
      }
    }

    // Yeni nokta ekle
    return {
      nextState:  { ...state, points: [...state.points, point] },
      newSection: null,
    }
  }

  return { nextState: state, newSection: null }
}

export function handlePolygonMouseMove(
  state:    PolygonToolState,
  rawCursor: Point,
  shiftKey:  boolean,
  scale:     number,
): PolygonToolState {
  // Shift snap: son yerleştirilen noktadan açı kısıtla
  const lastPt       = state.points[state.points.length - 1]
  const snappedCursor = (shiftKey && lastPt && state.step === 'drawing')
    ? snapAngleFromPoint(lastPt, rawCursor)
    : rawCursor

  // Kapatma kontrolü — ham cursor ile değil, snapped ile yap
  const first          = state.points[0]
  const thresholdWorld = CLOSE_THRESHOLD / scale
  const isClosable     =
    state.step === 'drawing' &&
    state.points.length >= MIN_POLYGON_POINTS &&
    Boolean(first) &&
    dist(snappedCursor, first!) < thresholdWorld

  return {
    ...state,
    cursor:         rawCursor,
    snappedCursor,
    isClosable,
    isShiftSnapped: shiftKey && state.step === 'drawing',
  }
}

export function handlePolygonDblClick(
  state:   PolygonToolState,
  floorId: string,
  order:   number,
): { nextState: PolygonToolState; newSection: Section | null } {
  if (state.step !== 'drawing' || state.points.length < MIN_POLYGON_POINTS) {
    return { nextState: state, newSection: null }
  }

  return {
    nextState:  initialPolygonState,
    newSection: buildPolygonSection(state.points, floorId, order),
  }
}

// ─── Rect Handler'lar ─────────────────────────────────────────────────────────

export function handleRectMouseDown(
  _state: RectToolState,
  point:  Point,
): RectToolState {
  return {
    mode:           'rect',
    step:           'drawing',
    startPoint:     point,
    cursor:         point,
    isShiftSnapped: false,
  }
}

export function handleRectMouseMove(
  state:    RectToolState,
  cursor:   Point,
  shiftKey: boolean,
): RectToolState {
  if (state.step !== 'drawing' || !state.startPoint) {
    return { ...state, cursor, isShiftSnapped: false }
  }

  // Shift → kare zorla (kısa kenarı uzun kenara eşitle)
  let snappedCursor = cursor
  if (shiftKey) {
    const dx   = cursor.x - state.startPoint.x
    const dy   = cursor.y - state.startPoint.y
    const side = Math.max(Math.abs(dx), Math.abs(dy))
    snappedCursor = {
      x: state.startPoint.x + Math.sign(dx) * side,
      y: state.startPoint.y + Math.sign(dy) * side,
    }
  }

  return { ...state, cursor: snappedCursor, isShiftSnapped: shiftKey }
}

export function handleRectMouseUp(
  state:   RectToolState,
  floorId: string,
  order:   number,
): { nextState: RectToolState; newSection: Section | null } {
  if (state.step !== 'drawing' || !state.startPoint || !state.cursor) {
    return { nextState: initialRectState, newSection: null }
  }

  const w = Math.abs(state.cursor.x - state.startPoint.x)
  const h = Math.abs(state.cursor.y - state.startPoint.y)

  // Çok küçük dikdörtgen → iptal
  if (w < 10 || h < 10) {
    return { nextState: initialRectState, newSection: null }
  }

  return {
    nextState:  initialRectState,
    newSection: buildRectSection(state.startPoint, state.cursor, floorId, order),
  }
}