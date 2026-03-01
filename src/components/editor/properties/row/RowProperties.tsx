'use client'

// Row Properties paneli — tekli ve çoklu row seçimini destekler
//
// Mixed state kuralları:
//   Sayısal alan    → mixed ise placeholder "—", yazınca tüm rowlara uygular
//   Text alanı      → mixed ise placeholder "Mixed", yazınca uygular
//   Toggle/Select   → mixed ise aktif yok, seçim yapınca uygular
//   Category        → CategorySelectbox kendi mixed state'ini yönetir
//
// Labeling değişiklikleri updateRowLabeling → seat label'ları otomatik yeniden hesaplanır
// Diğer değişiklikler updateRows → toplu patch

import { useState, useCallback, useRef, useEffect } from 'react'
import PropertyRow from '@/canvas/objects/PropertyRow'
import NumberInput from '@/components/ui/NumberInput'
import TextInput from '@/components/ui/TextInput'
import SliderInput from '@/components/ui/SliderInput'
import SelectBox from '@/components/ui/SelectBox'
import ToggleButtonGroup from '@/components/ui/ToggleButtonGroup'
import CategorySelectbox from '../shared/CategorySelectbox'
import CategoryManagePanel from '../shared/CategoryManagePanel'
import { useMultiRow, isMixed, numericValue, stringValue } from '@/hooks/row/useMultiRow'
import type { Row, SeatLabelingMode, RowLabelPosition } from '@/store/types'
import type { SelectOption } from '@/components/ui/SelectBox'
import type { ToggleOption } from '@/components/ui/ToggleButtonGroup'
import { DEFAULT_SEAT_SPACING, DEFAULT_ROW_SPACING } from '@/lib/constants'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import TuneIcon from '@mui/icons-material/Tune'

const SEAT_LABELING_OPTIONS: SelectOption<SeatLabelingMode>[] = [
  { value: '1,2,3', label: '1, 2, 3, …' },
  { value: '1,3,5', label: '1, 3, 5, …' },
  { value: '2,4,6', label: '2, 4, 6, …' },
  { value: '1,3,5-6,4,2', label: '1,3,5 … 6,4,2' },
  { value: '5,3,1-2,4,6', label: '…5,3,1,2,4,6…' },
  { value: 'A,B,C', label: 'A, B, C, …' },
  { value: 'a,b,c', label: 'a, b, c, …' },
]

// Row label modu — sadece 2 seçenek (suffix pattern)
type RowLabelMode = 'alpha' | 'numeric'
interface RowLabelOption { value: RowLabelMode; label: string }
const ROW_LABEL_OPTIONS: RowLabelOption[] = [
  { value: 'alpha', label: 'A, B, C, …' },
  { value: 'numeric', label: '1, 2, 3, …' },
]

const NUMERIC_MODES = new Set<SeatLabelingMode>(['1,2,3', '1,3,5', '2,4,6', '1,3,5-6,4,2', '5,3,1-2,4,6'])

const POSITION_OPTIONS: ToggleOption<RowLabelPosition>[] = [
  { value: 'L', label: 'L' },
  { value: 'R', label: 'R' },
]

// Koltuk etiketleme yönü — yatay görünüm
const DIRECTION_OPTIONS: ToggleOption<'ltr' | 'rtl'>[] = [
  { value: 'ltr', label: '→' },
  { value: 'rtl', label: '←' },
]

// Çoklu row sıralama yönü — konumsal (yukarı/aşağı veya sol/sağ)
const ROW_SORT_DIR_OPTIONS: ToggleOption<'ltr' | 'rtl'>[] = [
  { value: 'ltr', label: '↓' },   // Artan — üstteki/soldaki row'a ilk etiket
  { value: 'rtl', label: '↑' },   // Azalan — alttaki/sağdaki row'a ilk etiket
]

interface RowPropertiesProps {
  rows: Row[]
}

export default function RowProperties({ rows }: RowPropertiesProps) {
  const { field, update, updateLabeling, applyAutoLabeling } = useMultiRow(rows)
  const [isManageOpen, setIsManageOpen] = useState(false)
  const manageButtonRef = useRef<HTMLButtonElement>(null)
  const managePanelRef = useRef<HTMLDivElement>(null)
  const isMulti = rows.length > 1

  // Manage paneli dışarı tıklayınca kapat
  useEffect(() => {
    if (!isManageOpen) return
    const handle = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        !managePanelRef.current?.contains(target) &&
        !manageButtonRef.current?.contains(target)
      ) setIsManageOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [isManageOpen])

  // Alan değerleri
  const curve = field('curve')
  const rowSpacing = field('rowSpacing')
  const seatSpacing = field('seatSpacing')
  const sectionLabel = field('sectionLabel')
  const rowLabel = field('rowLabel')
  // Mevcut rowLabel değerinden mod çıkar — ilk karakter rakamsa numeric, değilse alpha
  const rawRowLabel = !isMixed(rowLabel) ? (rowLabel as string) : ''
  const rowLabelMode: RowLabelMode | 'mixed' = isMixed(rowLabel)
    ? 'mixed'
    : /^[0-9]/.test(rawRowLabel) ? 'numeric' : 'alpha'
  const rowLabelPos = field('rowLabelPosition')
  const labelingMode = field('seatLabelingMode')
  const labelStartAt = field('seatLabelStartAt')
  const rowLabelDir = field('rowLabelDirection')
  const labelDir = field('seatLabelDirection')

  // Sayısal modda mı? (mixed durumunda "Start at" kapalı)
  const isNumericMode = !isMixed(labelingMode) && NUMERIC_MODES.has(labelingMode)

  return (
    <div className="flex flex-col">

      {/* Çoklu seçim banner */}
      {isMulti && (
        <div className="px-3 py-2 bg-[var(--color-surface-2)] border-b border-[var(--color-border)]">
          <p className="text-[11px] text-[var(--color-text-muted)]">
            <span className="text-[var(--color-accent)] font-semibold">{rows.length} rows</span>
            {' '}selected — değişiklikler hepsine uygulanır
          </p>
        </div>
      )}

      {/* ── Category ──────────────────────────────────── */}
      <Section title="Category">
        <div className="px-3 py-2">
          <CategorySelectbox rows={rows} />
        </div>
        <div className="px-3 pb-3 relative">
          <button
            ref={manageButtonRef}
            type="button"
            onClick={() => setIsManageOpen((v) => !v)}
            className="
              flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-medium
              border border-[var(--color-border)] bg-[var(--color-surface)]
              text-[var(--color-text-muted)] hover:text-[var(--color-text)]
              hover:bg-[var(--color-surface-2)] transition-colors duration-100 cursor-pointer
            "
          >
            <TuneIcon sx={{ fontSize: 13 }} />
            Manage categories
          </button>
          {isManageOpen && (
            <div ref={managePanelRef} className="absolute left-3 top-full mt-1 z-50">
              <CategoryManagePanel onClose={() => setIsManageOpen(false)} />
            </div>
          )}
        </div>
      </Section>

      {/* ── Row ───────────────────────────────────────── */}
      <Section title="Row">
        <div className="px-3 py-2 flex flex-col gap-0.5">

          {/* Seats — sadece tekli seçimde */}
          {!isMulti && (
            <PropertyRow label="Seats">
              <NumberInput
                value={rows[0].seats.length}
                onChange={(v) => {
                  const row = rows[0]
                  const current = row.seats.length
                  if (v === current) return
                  const newSeats = v > current
                    ? [
                      ...row.seats,
                      ...Array.from({ length: v - current }, (_, i) => ({
                        id: crypto.randomUUID(),
                        rowId: row.id,
                        index: current + i,
                        label: String(current + i + 1),
                        categoryIds: [] as string[],
                        accessible: false,
                        restrictedView: false,
                        isAvailable: true,
                      })),
                    ]
                    : row.seats.slice(0, v)
                  update({ seats: newSeats })
                }}
                min={1}
                max={999}
                unit="seats"
              />
            </PropertyRow>
          )}

          <PropertyRow label="Curve">
            <div className="w-[104px]">
              <SliderInput
                value={numericValue(curve)}
                onChange={(v) => update({ curve: v })}
                min={-100}
                max={100}
                modified={!isMixed(curve) && curve !== 0}
              />
            </div>
          </PropertyRow>

          <PropertyRow label="Row spacing">
            <NumberInput
              value={numericValue(rowSpacing)}
              onChange={(v) => update({ rowSpacing: v })}
              min={0}
              max={500}
              unit="pt"
              modified={!isMixed(rowSpacing) && rowSpacing !== DEFAULT_ROW_SPACING}
            />
          </PropertyRow>

          <PropertyRow label="Seat spacing">
            <NumberInput
              value={numericValue(seatSpacing)}
              onChange={(v) => update({ seatSpacing: v })}
              min={20}
              max={200}
              unit="pt"
              modified={!isMixed(seatSpacing) && seatSpacing !== DEFAULT_SEAT_SPACING}
            />
          </PropertyRow>

        </div>
      </Section>

      {/* ── Section Labeling ──────────────────────────── */}
      <Section title="Section labeling">
        <div className="px-3 py-2 flex flex-col gap-0.5">
          <PropertyRow label="Section label">
            <TextInput
              value={stringValue(sectionLabel as string | 'mixed')}
              onChange={(v) => updateLabeling({ sectionLabel: v })}
              placeholder={isMixed(sectionLabel) ? 'Mixed' : 'e.g. Orchestra'}
              modified={!isMixed(sectionLabel) && Boolean(sectionLabel)}
            />
          </PropertyRow>
        </div>
      </Section>

      {/* ── Row Labeling ──────────────────────────────── */}
      <Section title="Row labeling">
        <div className="px-3 py-2 flex flex-col gap-0.5">

          {isMulti ? (
            // ── Multi-row: otomatik etiketleme ──────────────────
            // Seçilen mod + yön ile row'lar konumsal olarak sıralanır ve etiketlenir
            // Yatay düzende (spanX > spanY) → X'e göre sırala
            // Dikey düzende (spanY > spanX) → Y'ye göre sırala
            <>
              <PropertyRow label="Mode">
                <SelectBox<RowLabelMode>
                  value={rowLabelMode === 'mixed' ? null : rowLabelMode}
                  onChange={(v) => {
                    const dir = (isMixed(rowLabelDir) ? 'ltr' : rowLabelDir) as 'ltr' | 'rtl'
                    applyAutoLabeling(v, dir)
                  }}
                  options={ROW_LABEL_OPTIONS}
                  placeholder={rowLabelMode === 'mixed' ? 'Select to apply…' : undefined}
                  modified={!isMixed(rowLabel) && Boolean(rowLabel)}
                />
              </PropertyRow>

              <PropertyRow label="Direction">
                <ToggleButtonGroup<'ltr' | 'rtl'>
                  options={ROW_SORT_DIR_OPTIONS}
                  value={isMixed(rowLabelDir) ? null : rowLabelDir as 'ltr' | 'rtl'}
                  onChange={(v) => {
                    const mode = rowLabelMode === 'mixed' ? 'alpha' : rowLabelMode
                    applyAutoLabeling(mode, v as 'ltr' | 'rtl')
                  }}
                  deselectable={false}
                />
              </PropertyRow>
            </>
          ) : (
            // ── Single row: manuel etiket girişi ─────────────────
            <PropertyRow label="Label">
              <TextInput
                value={stringValue(rowLabel as string | 'mixed')}
                onChange={(v) => updateLabeling({ rowLabel: v })}
                placeholder="e.g. A"
                modified={!isMixed(rowLabel) && Boolean(rowLabel)}
              />
            </PropertyRow>
          )}

          <PropertyRow label="Position">
            <ToggleButtonGroup<RowLabelPosition>
              options={POSITION_OPTIONS}
              values={isMixed(rowLabelPos) ? [] : (rowLabelPos as RowLabelPosition[])}
              onChangeMulti={(v) => updateLabeling({ rowLabelPosition: v as RowLabelPosition[] })}
            />
          </PropertyRow>

        </div>
      </Section>

      {/* ── Seat Labeling ─────────────────────────────── */}
      <Section title="Seat labeling">
        <div className="px-3 py-2 flex flex-col gap-0.5">

          <PropertyRow label="Labels">
            <SelectBox<SeatLabelingMode>
              value={isMixed(labelingMode) ? null : labelingMode as SeatLabelingMode}
              onChange={(v) => updateLabeling({ seatLabelingMode: v })}
              options={SEAT_LABELING_OPTIONS}
              placeholder={isMixed(labelingMode) ? 'Mixed' : 'Select…'}
            />
          </PropertyRow>

          <PropertyRow label="Start at">
            <NumberInput
              value={numericValue(labelStartAt)}
              onChange={(v) => updateLabeling({ seatLabelStartAt: v })}
              min={0}
              max={9999}
              unit=""
              modified={!isMixed(labelStartAt) && labelStartAt !== 1}
            />
          </PropertyRow>

          <PropertyRow label="Direction">
            <ToggleButtonGroup<'ltr' | 'rtl'>
              options={DIRECTION_OPTIONS}
              value={isMixed(labelDir) ? null : labelDir as 'ltr' | 'rtl'}
              onChange={(v) => updateLabeling({ seatLabelDirection: v as 'ltr' | 'rtl' })}
              deselectable={false}
            />
          </PropertyRow>

        </div>
      </Section>

    </div>
  )
}

// --- Yeniden kullanılabilir collapse bölümü ---

interface SectionProps {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}

function Section({ title, children, defaultOpen = true }: SectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="border-b border-[var(--color-border)]">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="
          flex items-center justify-between w-full
          px-3 py-2.5 cursor-pointer border-none bg-transparent text-left
        "
      >
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          {title}
        </span>
        {isOpen
          ? <ExpandLessIcon sx={{ fontSize: 14, color: 'var(--color-text-muted)' }} />
          : <ExpandMoreIcon sx={{ fontSize: 14, color: 'var(--color-text-muted)' }} />
        }
      </button>
      {isOpen && children}
    </div>
  )
}