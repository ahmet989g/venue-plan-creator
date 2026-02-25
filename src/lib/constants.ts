// Canvas zoom ve grid için temel sabitler

export const MIN_SCALE = 0.05;  // %5 — büyük stadyum genel bakış
export const MAX_SCALE = 8.0;   // %800 — tek koltuk detay
export const ZOOM_FACTOR = 1.1;

// Grid yoğunluğu eşikleri (px cinsinden hücre boyutu)
export const GRID_THRESHOLDS = {
  dense: 20,
  normal: 40,
  sparse: 80,
} as const

// Varsayılan canvas origin
export const CANVAS_ORIGIN = { x: 0, y: 0 };

// Undo/Redo stack limiti
export const MAX_HISTORY_SIZE = 50;

// Koltuk boyutu (Konva radius — px)
export const SEAT_RADIUS = 12;

// Row üzerindeki koltukların birbirine olan minimum mesafesi (px)
export const DEFAULT_SEAT_SPACING = 36;

// Snap noktası ararken yakınlık kontrolü için piksel cinsinden eşik
export const DEFAULT_ROW_SPACING = 16;