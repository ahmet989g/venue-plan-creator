// Canvas zoom ve grid için temel sabitler

export const MIN_SCALE   = 0.05  // %5  — büyük stadyum genel bakış
export const MAX_SCALE   = 8.0   // %800 — tek koltuk detay
export const ZOOM_FACTOR = 1.1

// Grid yoğunluğu eşikleri (px cinsinden hücre boyutu)
export const GRID_THRESHOLDS = {
  dense:  20,
  normal: 40,
  sparse: 80,
} as const

// Varsayılan canvas origin
export const CANVAS_ORIGIN = { x: 0, y: 0 }

// Undo/Redo stack limiti
export const MAX_HISTORY_SIZE = 50

// Koltuk boyutu (Konva radius — px)
export const SEAT_RADIUS = 12

// Row üzerindeki koltukların birbirine olan minimum mesafesi (px)
export const DEFAULT_SEAT_SPACING = 36

// Snap noktası ararken yakınlık kontrolü için piksel cinsinden eşik
export const DEFAULT_ROW_SPACING = 16

// Kategori atanmamış koltukların rengi
export const DEFAULT_SEAT_COLOR = '#4a90d9'

// Birden fazla kategori atanmış koltukların sabit rengi
export const MULTI_CATEGORY_COLOR = '#9b59b6'

// Kategori yönetim panelinde sunulan preset renkler (colorblind-safe)
export const CATEGORY_PRESET_COLORS: string[] = [
  '#E63946', // VIP/Premium — kırmızı
  '#F4A261', // VIP/Premium — turuncu
  '#E9C46A', // VIP/Premium — sarı
  '#2A9D8F', // Standart — teal
  '#457B9D', // Standart — mavi
  '#6A4C93', // Standart — mor
  '#8D99AE', // Ekonomi/GA — gri mavi
  '#A8DADC', // Ekonomi/GA — açık teal
  '#CDB4DB', // Ekonomi/GA — lavanta
  '#264653', // Özel — koyu yeşil
  '#E76F51', // Özel — mercan
  '#52B788', // Özel — yeşil
]