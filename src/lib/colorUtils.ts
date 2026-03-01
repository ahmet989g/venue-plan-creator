// Renk yardımcı fonksiyonları
//
// SectionShape ve ilerideki bileşenler bu fonksiyonları kullanır
// Tüm section renkleri hex formatında saklanır, render için rgba'ya çevrilir

/**
 * Hex rengi rgba string'e çevirir
 * @param hex    — "#f78166" veya "f78166"
 * @param alpha  — 0–1 arası opaklık
 * @returns      "rgba(r, g, b, alpha)"
 */
export function hexToRgba(hex: string, alpha: number): string {
  // Başındaki # işaretini kaldır
  const clean = hex.replace('#', '')

  // 3 karakterli shorthand genişlet: "abc" → "aabbcc"
  const full = clean.length === 3
    ? clean.split('').map((c) => c + c).join('')
    : clean

  const r = parseInt(full.substring(0, 2), 16)
  const g = parseInt(full.substring(2, 4), 16)
  const b = parseInt(full.substring(4, 6), 16)

  // Geçersiz renk → şeffaf geri dön
  if (isNaN(r) || isNaN(g) || isNaN(b)) return `rgba(0, 0, 0, ${alpha})`

  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/**
 * Hex rengin parlaklığını hesapla (0–1)
 * Koyu renk tespiti için kullanılır (beyaz/siyah metin kararı)
 */
export function hexLuminance(hex: string): number {
  const clean = hex.replace('#', '')
  const full  = clean.length === 3
    ? clean.split('').map((c) => c + c).join('')
    : clean

  const r = parseInt(full.substring(0, 2), 16) / 255
  const g = parseInt(full.substring(2, 4), 16) / 255
  const b = parseInt(full.substring(4, 6), 16) / 255

  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/**
 * Renk üzerine okunabilir metin rengi döndür
 * @returns "#ffffff" veya "#1f2328"
 */
export function contrastColor(hex: string): string {
  return hexLuminance(hex) > 0.4 ? '#1f2328' : '#ffffff'
}

/**
 * Hex rengi HSL'e çevirerek karartır
 * Section fill seçilince border + label için otomatik koyu ton üretir
 * @param hex      — '#rrggbb'
 * @param amount   — 0–1 arası kararma miktarı (default 0.25)
 * @returns        — kararatılmış hex renk
 */
export function darkenColor(hex: string, amount = 0.25): string {
  const clean = hex.replace('#', '')
  const full  = clean.length === 3
    ? clean.split('').map((c) => c + c).join('')
    : clean

  const r = parseInt(full.substring(0, 2), 16) / 255
  const g = parseInt(full.substring(2, 4), 16) / 255
  const b = parseInt(full.substring(4, 6), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0, s = 0
  let l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }

  // Lightness'ı azalt
  l = Math.max(0, l - amount)

  // HSL → RGB
  function hue2rgb(p: number, q: number, t: number) {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1/6) return p + (q - p) * 6 * t
    if (t < 1/2) return q
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6
    return p
  }

  let rOut: number, gOut: number, bOut: number
  if (s === 0) {
    rOut = gOut = bOut = l
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    rOut = hue2rgb(p, q, h + 1/3)
    gOut = hue2rgb(p, q, h)
    bOut = hue2rgb(p, q, h - 1/3)
  }

  const toHex = (v: number) => Math.round(v * 255).toString(16).padStart(2, '0')
  return `#${toHex(rOut)}${toHex(gOut)}${toHex(bOut)}`
}