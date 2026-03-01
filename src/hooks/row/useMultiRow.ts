'use client'

// Çoklu row seçimi için mixed-state yönetimi
//
// Kullanım:
//   const { field, update, updateLabeling } = useMultiRow(rows)
//   field('curve')          → ortak değer | 'mixed'
//   update({ curve: 10 })   → tüm seçili rowlara yaz
//
// Mixed durumu:
//   Sayısal input → placeholder "—", yazınca tüm rowlara uygular
//   Text input    → placeholder "Mixed"
//   Toggle/Select → aktif durum yok, seçim yapınca uygular

import { useCallback } from 'react'
import { useEditorStore } from '@/store/editor.store'
import type { Row, SeatLabelingMode, RowLabelPosition } from '@/store/types'

export type MixedValue<T> = T | 'mixed'

export function useMultiRow(rows: Row[]) {
  const updateRows       = useEditorStore((s) => s.updateRows)
  const updateRowLabeling = useEditorStore((s) => s.updateRowLabeling)

  // Bir field'ın değerini döndür — tüm rowlarda aynıysa değer, farklıysa 'mixed'
  const field = useCallback(
    <K extends keyof Row>(key: K): MixedValue<Row[K]> => {
      if (rows.length === 0) return 'mixed'
      const first = rows[0][key]
      const allSame = rows.every((r) => {
        const v = r[key]
        // Dizi karşılaştırması — rowLabelPosition gibi array alanlar için
        if (Array.isArray(first) && Array.isArray(v)) {
          return JSON.stringify(v) === JSON.stringify(first)
        }
        return v === first
      })
      return allSame ? first : 'mixed'
    },
    [rows],
  )

  // Tüm seçili rowlara patch uygula (non-labeling alanlar)
  const update = useCallback(
    (patch: Partial<Row>) => {
      const ids = rows.map((r) => r.id)
      updateRows(ids, patch)
    },
    [rows, updateRows],
  )

  // Labeling alanlarını güncelle — seat label'larını da yeniden hesaplar
  const updateLabeling = useCallback(
    (patch: Partial<Pick<Row,
      'seatLabelingMode' | 'seatLabelStartAt' | 'seatLabelDirection' |
      'sectionLabel' | 'rowLabel' | 'rowLabelPosition' | 'rowLabelDirection'
    >>) => {
      // Her row için ayrı çağrı — updateRowLabeling tek row alır
      rows.forEach((r) => updateRowLabeling(r.id, patch))
    },
    [rows, updateRowLabeling],
  )


  // Çoklu row otomatik etiketleme:
  //   1. Row'ları konumlarına göre sırala (spatial sort)
  //   2. Seçilen mod (alpha/numeric) ile ardışık etiket ata
  //   3. Her row için updateObject çağrısı
  //
  // Spatial sort algoritması:
  //   Row'ların Y yayılımı > X yayılımı ise dikey düzen → Y'ye göre sırala
  //   Aksi halde yatay düzen → X'e göre sırala
  //   Direction 'rtl' → sırayı ters çevir
  const applyAutoLabeling = useCallback(
    (mode: 'alpha' | 'numeric', direction: 'ltr' | 'rtl') => {
      if (rows.length === 0) return

      // Bounding box yayılımları
      const xs    = rows.map((r) => r.x)
      const ys    = rows.map((r) => r.y)
      const spanX = Math.max(...xs) - Math.min(...xs)
      const spanY = Math.max(...ys) - Math.min(...ys)

      // Dominant eksene göre sırala
      const sorted = [...rows].sort((a, b) =>
        spanY > spanX ? a.y - b.y : a.x - b.x,
      )
      if (direction === 'rtl') sorted.reverse()

      // Etiket üret ve uygula
      sorted.forEach((row, i) => {
        const label = mode === 'alpha' ? toAlphaLabel(i) : String(i + 1)
        updateRowLabeling(row.id, { rowLabel: label, rowLabelDirection: direction })
      })
    },
    [rows, updateRowLabeling],
  )

  return { field, update, updateLabeling, applyAutoLabeling }
}

// --- Yardımcı tipler & type guard'lar ---

export function isMixed<T>(v: MixedValue<T>): v is 'mixed' {
  return v === 'mixed'
}

// Sayısal mixed değer için NumberInput'a geçilecek değer
// mixed → 0 döndürür (input modified=false, placeholder ile gösterilir)
export function numericValue(v: MixedValue<number>): number {
  return isMixed(v) ? 0 : v
}

// String mixed değer için TextInput'a geçilecek değer
export function stringValue(v: MixedValue<string>): string {
  return isMixed(v) ? '' : v
}

// A, B, ..., Z, AA, AB, ... şeklinde alfabetik etiket üretici
// n = 0-based index
function toAlphaLabel(n: number): string {
  let result = ''
  let num = n
  do {
    result = String.fromCharCode(65 + (num % 26)) + result
    num = Math.floor(num / 26) - 1
  } while (num >= 0)
  return result
}