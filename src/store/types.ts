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
  | 'row-segmented'
  | 'multiple-row'
  | 'round-table'
  | 'rectangular-table'
  | 'booth'

// --- Kategori ---

export interface Category {
  id:           string
  label:        string
  color:        string
  isWheelchair: boolean  // Erişilebilirlik ikonu gösterir
  order:        number   // Listede sıra — dnd-kit ile değiştirilir
}

// --- Koltuk numaralama modları ---

export type SeatLabelingMode =
  | '1,2,3'        // 1, 2, 3, ...        soldan sağa ardışık
  | '1,3,5'        // 1, 3, 5, ...        soldan sağa tek sayılar
  | '2,4,6'        // 2, 4, 6, ...        soldan sağa çift sayılar
  | '1,3,5-6,4,2'  // 1,3,5...,6,4,2     soldan ortaya tek, sağdan ortaya çift
  | '5,3,1-2,4,6'  // ..5,3,1,2,4,6..    ortadan dışarıya
  | 'A,B,C'        // A, B, C, ...        büyük harfler
  | 'a,b,c'        // a, b, c, ...        küçük harfler

// --- Koltuk ---

export interface Seat {
  id:             string          // UUID — rezervasyon buraya bağlanır
  rowId:          string
  index:          number          // 0-based sıra
  label:          string          // Görünen numara/harf: "15", "A"
  categoryIds:    string[]        // Birden fazla kategori atanabilir
  accessible:     boolean         // Tekerlekli sandalye koltuğu
  restrictedView: boolean         // Kısıtlı görüş
  isAvailable:    boolean
}

// --- Row etiketleme ---

export type RowLabelPosition = 'L' | 'R'

export interface Row {
  id:                  string
  type:                'row'
  floorId:             string
  sectionId:           string | null
  label:               string
  seats:               Seat[]
  x:                   number
  y:                   number
  rotation:            number
  curve:               number          // -100 ile 100 arası yay değeri, 0 = düz
  seatSpacing:         number
  rowSpacing:          number          // Sıra arası boşluk (pt)
  isVisible:           boolean
  isLocked:            boolean
  // Section labeling
  sectionLabel?:       string
  // Row labeling
  rowLabel?:           string          // Sıra kodu: "A", "B-1" vb.
  rowLabelPosition:    RowLabelPosition[]  // Hangi tarafta gösterileceği — boş = hiçbiri
  // Seat labeling
  rowLabelDirection:   'ltr' | 'rtl'   // Sıra etiketi yönü (A→B→C veya C→B→A)
  seatLabelingMode:    SeatLabelingMode
  seatLabelStartAt:    number          // Numaralandırma başlangıcı
  seatLabelDirection:  'ltr' | 'rtl'  // Numaralandırma yönü
}

export type TableShape = 'round' | 'rectangular'
export type TableBookingMode = 'whole-table' | 'per-seat'

export interface Table {
  id:           string
  type:         'table'
  shape:        TableShape
  floorId:      string
  sectionId:    string | null
  label:        string
  x:            number
  y:            number
  rotation:     number
  categoryIds:  string[]
  bookingMode:  TableBookingMode
  // Yuvarlak masa
  diameter?:    number
  chairCount?:  number
  // Dikdörtgen masa
  width?:       number
  height?:      number
  chairsUp?:    number
  chairsDown?:  number
  chairsLeft?:  number
  chairsRight?: number
  seats?:       Seat[]
}

export type GAAreaShape = 'rect' | 'ellipse' | 'polygon'

export interface GAArea {
  id:          string
  type:        'ga-area'
  shape:       GAAreaShape
  floorId:     string
  sectionId:   string | null
  label:       string
  capacity:    number
  categoryIds: string[]
  x:           number
  y:           number
  width?:      number
  height?:     number
  points?:     Point[]
}

export interface Booth {
  id:          string
  type:        'booth'
  floorId:     string
  sectionId:   string | null
  label:       string
  categoryIds: string[]
  x:           number
  y:           number
  width:       number
  height:      number
  rotation:    number
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
  id:        string
  type:      'stage'
  label:     string
  stageType: StageType
  shape:     ShapeType
  x:         number
  y:         number
  width?:    number
  height?:   number
  points?:   Point[]
}

export interface FocalPoint {
  id:   string
  type: 'focal-point'
  x:    number
  y:    number
}

export interface ShapeObject {
  id:      string
  type:    'shape'
  shape:   ShapeType
  x:       number
  y:       number
  width?:  number
  height?: number
  points?: Point[]
  fill?:   string
  stroke?: string
}

export interface LineObject {
  id:      string
  type:    'line'
  points:  Point[]
  stroke?: string
}

export interface TextObject {
  id:        string
  type:      'text'
  x:         number
  y:         number
  text:      string
  fontSize?: number
  fill?:     string
}

export interface ImageObject {
  id:     string
  type:   'image'
  x:      number
  y:      number
  width:  number
  height: number
  src:    string
}

export interface IconObject {
  id:       string
  type:     'icon'
  x:        number
  y:        number
  iconName: string
  size:     number
  color?:   string
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
  id:        string
  floorId:   string
  label:     string
  color:     string
  shape:     'rect' | 'polygon'
  x?:        number
  y?:        number
  width?:    number
  height?:   number
  points?:   Point[]
  isVisible: boolean
  isLocked:  boolean
  zoomable:  boolean
  order:     number
  objectIds: string[]
}

// --- Floor ---

export interface Floor {
  id:      string
  label:   string
  order:   number
  sections: Section[]
  objects: ChartObject[]
  lastViewport?: Viewport
  viewerConfig?: {
    showSilhouetteBelow: boolean
    silhouetteOpacity:   number
  }
}

// --- Ana Chart ---

export interface VenueChart {
  id:         string
  name:       string
  venueType:  VenueType
  floors:     Floor[]
  categories: Category[]
  origin:     Point
  createdAt:  Date
  updatedAt:  Date
}

// --- Editor Section Context ---
// interface değil type — union ile null birleştirilebilsin diye

export type SectionEditingContext = {
  type:             'section'
  sectionId:        string
  floorId:          string
  previousViewport: Viewport
}

export type EditingContext = SectionEditingContext | null