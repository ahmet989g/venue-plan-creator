// Venue Plan Creator — tüm veri modeli tip tanımları

// --- Temel ---

export interface Point {
  x: number
  y: number
}

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export interface Viewport {
  x: number
  y: number
  scale: number
}

// --- Venue ---

export type VenueType =
  | 'large-theatre'
  | 'small-theatre'
  | 'gala-dinner'
  | 'trade-show'

export type ToolType =
  | 'select'
  | 'select-seats'
  | 'selection-brush'
  | 'select-same-type'
  | 'node'
  | 'focal-point'
  | 'area'
  | 'rectangle'
  | 'line'
  | 'text'
  | 'image'
  | 'icon'
  | 'hand'
  | 'section'
  | 'rectangular-section'
  | 'row'
  | 'multiple-row'
  | 'round-table'
  | 'rectangular-table'
  | 'booth'

// --- Kategori ---

export interface Category {
  id: string
  label: string
  color: string
  accessible: boolean
}

// --- Koltuk ---

export interface Seat {
  id: string           // UUID — rezervasyon buraya bağlanır
  rowId: string
  index: number        // 0-based sıra
  label: string        // Görünen numara: "15"
  categoryId: string | null
  accessible: boolean
  restrictedView: boolean
  isAvailable: boolean
}

// --- Nesneler ---

export interface Row {
  id: string
  type: 'row'
  floorId: string
  sectionId: string | null
  label: string
  seats: Seat[]
  x: number
  y: number
  rotation: number
  curve: number
  seatSpacing: number
  rowSpacing?: number
  isVisible: boolean
  isLocked: boolean
}

export type TableShape = 'round' | 'rectangular'
export type TableBookingMode = 'whole-table' | 'per-seat'

export interface Table {
  id: string
  type: 'table'
  shape: TableShape
  floorId: string
  sectionId: string | null
  label: string
  x: number
  y: number
  rotation: number
  categoryId: string | null
  bookingMode: TableBookingMode
  // Yuvarlak masa
  diameter?: number
  chairCount?: number
  // Dikdörtgen masa
  width?: number
  height?: number
  chairsUp?: number
  chairsDown?: number
  chairsLeft?: number
  chairsRight?: number
  seats?: Seat[]
}

export type GAAreaShape = 'rect' | 'ellipse' | 'polygon'

export interface GAArea {
  id: string
  type: 'ga-area'
  shape: GAAreaShape
  floorId: string
  sectionId: string | null
  label: string
  capacity: number
  categoryId: string | null
  x: number
  y: number
  width?: number
  height?: number
  points?: Point[]
}

export interface Booth {
  id: string
  type: 'booth'
  floorId: string
  sectionId: string | null
  label: string
  categoryId: string | null
  x: number
  y: number
  width: number
  height: number
  rotation: number
}

export type StageType =
  | 'stage'
  | 'entrance'
  | 'stairs'
  | 'bar'
  | 'cafe'
  | 'restrooms'
  | 'custom'

export type ShapeType = 'rect' | 'ellipse' | 'polygon'

export interface Stage {
  id: string
  type: 'stage'
  label: string
  stageType: StageType
  shape: ShapeType
  x: number
  y: number
  width?: number
  height?: number
  points?: Point[]
}

export interface FocalPoint {
  id: string
  type: 'focal-point'
  x: number
  y: number
}

export interface ShapeObject {
  id: string
  type: 'shape'
  shape: ShapeType
  x: number
  y: number
  width?: number
  height?: number
  points?: Point[]
  fill?: string
  stroke?: string
}

export interface LineObject {
  id: string
  type: 'line'
  points: Point[]
  stroke?: string
}

export interface TextObject {
  id: string
  type: 'text'
  x: number
  y: number
  text: string
  fontSize?: number
  fill?: string
}

export interface ImageObject {
  id: string
  type: 'image'
  x: number
  y: number
  width: number
  height: number
  src: string
}

export interface IconObject {
  id: string
  type: 'icon'
  x: number
  y: number
  iconName: string
  size: number
  color?: string
}

export type ChartObject =
  | Row
  | Table
  | GAArea
  | Booth
  | Stage
  | FocalPoint
  | ShapeObject
  | LineObject
  | TextObject
  | ImageObject
  | IconObject

// --- Section ---

export interface Section {
  id: string
  floorId: string
  label: string
  color: string
  shape: 'rect' | 'polygon'
  x?: number
  y?: number
  width?: number
  height?: number
  points?: Point[]
  isVisible: boolean
  isLocked: boolean
  zoomable: boolean
  order: number
  objectIds: string[]
}

// --- Floor ---

export interface Floor {
  id: string
  label: string
  order: number
  sections: Section[]
  objects: ChartObject[]
  lastViewport?: Viewport
  viewerConfig?: {
    showSilhouetteBelow: boolean
    silhouetteOpacity: number
  }
}

// --- Ana Chart ---

export interface VenueChart {
  id: string
  name: string
  venueType: VenueType
  floors: Floor[]
  categories: Category[]
  origin: Point
  createdAt: Date
  updatedAt: Date
}

// --- Editor Section Context ---
// interface değil type — union ile null birleştirilebilsin diye

export type SectionEditingContext = {
  type: 'section'
  sectionId: string
  floorId: string
  previousViewport: Viewport
}

export type EditingContext = SectionEditingContext | null