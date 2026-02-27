// Koltuk numaralama algoritmaları — pure fonksiyonlar
// Her mod için computeSeatLabels(count, mode, startAt, direction) → string[]
//
// Modlar:
//   1,2,3         → soldan sağa ardışık
//   1,3,5         → soldan sağa tek sayılar
//   2,4,6         → soldan sağa çift sayılar
//   1,3,5-6,4,2   → sol yarı tek (soldan içe), sağ yarı çift (sağdan içe, daima 2'de biter)
//   5,3,1-2,4,6   → merkeze yakın küçük numara, dışa gidince büyür
//   A,B,C         → büyük harfler
//   a,b,c         → küçük harfler

import type { SeatLabelingMode } from '@/store/types'

export function computeSeatLabels(
  count:     number,
  mode:      SeatLabelingMode,
  startAt:   number,
  direction: 'ltr' | 'rtl',
): string[] {
  if (count <= 0) return []

  let labels: string[]

  switch (mode) {
    case '1,2,3':       labels = sequential(count, startAt);       break
    case '1,3,5':       labels = oddNumbers(count, startAt);        break
    case '2,4,6':       labels = evenNumbers(count, startAt);       break
    case '1,3,5-6,4,2': labels = splitOddEven(count, startAt);     break
    case '5,3,1-2,4,6': labels = centerOutward(count, startAt);    break
    case 'A,B,C':       labels = alphabetic(count, startAt, true);  break
    case 'a,b,c':       labels = alphabetic(count, startAt, false); break
    default:            labels = sequential(count, startAt)
  }

  return direction === 'rtl' ? [...labels].reverse() : labels
}

// ─── Yardımcı: index → harf ───────────────────────────────────────────────────
function indexToLetter(index: number, upper: boolean): string {
  let result = ''
  let n = index
  do {
    result = String.fromCharCode((upper ? 65 : 97) + (n % 26)) + result
    n = Math.floor(n / 26) - 1
  } while (n >= 0)
  return result
}

// ─── Mod 1: 1, 2, 3 ──────────────────────────────────────────────────────────
function sequential(count: number, startAt: number): string[] {
  return Array.from({ length: count }, (_, i) => String(startAt + i))
}

// ─── Mod 2: 1, 3, 5 ──────────────────────────────────────────────────────────
function oddNumbers(count: number, startAt: number): string[] {
  const base = startAt % 2 === 0 ? startAt + 1 : startAt
  return Array.from({ length: count }, (_, i) => String(base + i * 2))
}

// ─── Mod 3: 2, 4, 6 ──────────────────────────────────────────────────────────
function evenNumbers(count: number, startAt: number): string[] {
  const base = startAt % 2 !== 0 ? startAt + 1 : startAt
  return Array.from({ length: count }, (_, i) => String(base + i * 2))
}

// ─── Mod 4: 1,3,5 … 6,4,2 ────────────────────────────────────────────────────
// Sol yarı: tek sayılar soldan içe → 1, 3, 5, …
// Sağ yarı: çift sayılar sağdan içe → …, 6, 4, 2
//
// KURAL: sağ yarı daima 2 (evenBase = oddBase+1) ile BİTER,
//        yani içten dışa büyür [2,4,6,…] → görüntü için ters çevrilir […,6,4,2]
//
// Örnekler (startAt=1):
//   N=8  →  1, 3, 5, 7 | 8, 6, 4, 2   ✓
//   N=6  →  1, 3, 5    | 6, 4, 2       ✓
//   N=5  →  1, 3, 5    | 4, 2           ✓  (sağ yalnız 2 seat)
function splitOddEven(count: number, startAt: number): string[] {
  const leftCount  = Math.ceil(count / 2)
  const rightCount = count - leftCount

  // oddBase: startAt'ı tek sayıya yuvarla
  const oddBase  = startAt % 2 === 0 ? startAt + 1 : startAt
  // evenBase: daima oddBase'in bir fazlası — sağ tarafın en küçük (merkeze yakın) çifti
  const evenBase = oddBase + 1

  // Sol: artan tek sayılar → 1, 3, 5, …
  const left: string[] = Array.from(
    { length: leftCount },
    (_, i) => String(oddBase + i * 2),
  )

  // Sağ: içten dışa [2, 4, 6, …] → ters çevir → dıştan içe […, 6, 4, 2]
  const right: string[] = Array.from(
    { length: rightCount },
    (_, i) => String(evenBase + i * 2),
  ).reverse()

  return [...left, ...right]
}

// ─── Mod 5: 5,3,1 — 2,4,6 ────────────────────────────────────────────────────
// Merkeze yakın koltuk = küçük numara, dışa gidince büyür
// Sol yarı: tek sayılar, içten dışa büyür → görüntü ters: …,5,3,1
// Sağ yarı: çift sayılar, içten dışa büyür → görüntü: 2,4,6,…
//
// Örnekler (startAt=1):
//   N=8  →  7, 5, 3, 1 | 2, 4, 6, 8   ✓
//   N=6  →  5, 3, 1    | 2, 4, 6       ✓
function centerOutward(count: number, startAt: number): string[] {
  const leftCount  = Math.ceil(count / 2)
  const rightCount = count - leftCount

  const oddBase  = startAt % 2 === 0 ? startAt + 1 : startAt
  const evenBase = oddBase + 1

  // Sol: [oddBase, oddBase+2, …] → ters → dıştan içe: …,5,3,1
  const left: string[] = Array.from(
    { length: leftCount },
    (_, i) => String(oddBase + i * 2),
  ).reverse()

  // Sağ: [evenBase, evenBase+2, …] → içten dışa: 2,4,6,…
  const right: string[] = Array.from(
    { length: rightCount },
    (_, i) => String(evenBase + i * 2),
  )

  return [...left, ...right]
}

// ─── Mod 6 & 7: A,B,C / a,b,c ────────────────────────────────────────────────
function alphabetic(count: number, startAt: number, upper: boolean): string[] {
  return Array.from({ length: count }, (_, i) => indexToLetter(startAt + i, upper))
}