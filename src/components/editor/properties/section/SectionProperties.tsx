'use client'

// Section Properties Paneli
//
// Bölümler:
//   1. Color       — section dolgu + border rengi (labelColor)
//   2. Label       — metin, font size, rotation, position X/Y, visibility
//   3. Curves      — polygon kenar bezier edit modu (mevcut özellik korundu)

import { useState, useCallback, useId } from 'react'
import { useShallow } from 'zustand/react/shallow'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import VisibilityIcon from '@mui/icons-material/Visibility'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'
import ShowChartIcon from '@mui/icons-material/ShowChart'
import RefreshIcon from '@mui/icons-material/Refresh'
import { useEditorStore } from '@/store/editor.store'
import NumberInput from '@/components/ui/NumberInput'
import ColorPicker from '@/components/ui/ColorPicker'
import PropertyRow from '@/canvas/objects/PropertyRow'
import type { Section } from '@/store/types'

// ─── Sabitler ────────────────────────────────────────────────────────────────

const DEFAULT_FONT_SIZE = 14
const DEFAULT_ROTATION = 0
const DEFAULT_POS = 50   // %

// ─── Ana bileşen ─────────────────────────────────────────────────────────────

interface SectionPropertiesProps {
  section: Section
}

export default function SectionProperties({ section }: SectionPropertiesProps) {
  const { updateSection, resetSectionEdges } = useEditorStore(
    useShallow((s) => ({
      updateSection: s.updateSection,
      resetSectionEdges: s.resetSectionEdges,
    })),
  )

  const patch = useCallback(
    (p: Partial<Section>) => updateSection(section.id, p),
    [section.id, updateSection],
  )

  // ── Label text state (local — blur'da commit) ─────────────────────────────
  const [labelValue, setLabelValue] = useState(section.label)

  const handleLabelBlur = useCallback(() => {
    if (labelValue !== section.label) patch({ label: labelValue })
  }, [labelValue, section.label, patch])

  const handleLabelKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') e.currentTarget.blur()
      if (e.key === 'Escape') { setLabelValue(section.label); e.currentTarget.blur() }
    },
    [section.label],
  )

  // ── Curve toggle ──────────────────────────────────────────────────────────

  const handleCurveToggle = useCallback(() => {
    const next = !section.curveEditMode
    if (next && section.shape === 'polygon' && !section.edges?.length) {
      const pts = section.points ?? []
      const edges = pts.map((pt, i) => {
        const nxt = pts[(i + 1) % pts.length]
        return { isCurved: false, cpx: (pt.x + nxt.x) / 2, cpy: (pt.y + nxt.y) / 2 }
      })
      patch({ curveEditMode: next, edges })
    } else {
      patch({ curveEditMode: next })
    }
  }, [section, patch])

  const handleResetCurves = useCallback(() => {
    resetSectionEdges(section.id)
  }, [section.id, resetSectionEdges])

  const isCurveActive = Boolean(section.curveEditMode)
  const isPolygon = section.shape === 'polygon'

  // Renk — labelColor varsa onu kullan, yoksa section.color veya default
  const currentColor = section.color ?? '#2563eb'

  return (
    <div className="flex flex-col">

      {/* ══ 1. COLOR ════════════════════════════════════════════════════════ */}
      <PanelSection title="Color">
        <div className="px-3 py-3">
          <p className="text-[11px] text-[var(--color-text-muted)] mb-2 leading-relaxed">
            Section dolgu rengi. Label ve border rengi bu renkten otomatik türetilir.
          </p>
          <ColorPicker
            value={currentColor}
            onChange={(c) => patch({ color: c })}
          />
        </div>
      </PanelSection>

      {/* ══ 2. LABEL ════════════════════════════════════════════════════════ */}
      <PanelSection title="Label">
        <div className="px-3 py-2 flex flex-col gap-0.5">

          {/* Label metni */}
          <PropertyRow label="Label">
            <input
              type="text"
              value={labelValue}
              onChange={(e) => setLabelValue(e.target.value)}
              onBlur={handleLabelBlur}
              onKeyDown={handleLabelKeyDown}
              placeholder="Section adı…"
              className="
                h-7 w-[104px] px-2 rounded text-xs
                bg-[var(--color-surface)]
                text-[var(--color-text)]
                border border-[var(--color-border)]
                outline-none
                focus:ring-1 focus:ring-[var(--color-accent)]
                placeholder:text-[var(--color-text-muted)]
              "
            />
          </PropertyRow>

          {/* Visible toggle */}
          <PropertyRow label="Visible">
            <VisibilityToggle
              visible={section.labelVisible !== false}
              onChange={(v) => patch({ labelVisible: v })}
            />
          </PropertyRow>

          {/* Font size */}
          <PropertyRow label="Font size">
            <NumberInput
              value={section.labelFontSize ?? DEFAULT_FONT_SIZE}
              onChange={(v) => patch({ labelFontSize: v })}
              min={8}
              max={120}
              unit="pt"
              modified={(section.labelFontSize ?? DEFAULT_FONT_SIZE) !== DEFAULT_FONT_SIZE}
            />
          </PropertyRow>

          {/* Rotation */}
          <PropertyRow label="Rotation">
            <NumberInput
              value={section.labelRotation ?? DEFAULT_ROTATION}
              onChange={(v) => patch({ labelRotation: v })}
              min={-180}
              max={180}
              unit="°"
              modified={(section.labelRotation ?? 0) !== DEFAULT_ROTATION}
            />
          </PropertyRow>

          {/* Position X */}
          <PropertyRow label="Position X">
            <NumberInput
              value={section.labelX ?? DEFAULT_POS}
              onChange={(v) => patch({ labelX: v })}
              min={0}
              max={100}
              unit="%"
              modified={(section.labelX ?? DEFAULT_POS) !== DEFAULT_POS}
            />
          </PropertyRow>

          {/* Position Y */}
          <PropertyRow label="Position Y">
            <NumberInput
              value={section.labelY ?? DEFAULT_POS}
              onChange={(v) => patch({ labelY: v })}
              min={0}
              max={100}
              unit="%"
              modified={(section.labelY ?? DEFAULT_POS) !== DEFAULT_POS}
            />
          </PropertyRow>

        </div>
      </PanelSection>

      {/* ══ 3. CURVES — sadece polygon ══════════════════════════════════════ */}
      {isPolygon && (
        <PanelSection title="Curves">
          <div className="px-3 py-2 flex flex-col gap-3">

            {/* Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShowChartIcon
                  sx={{
                    fontSize: 15,
                    color: isCurveActive ? 'var(--color-accent)' : 'var(--color-text-muted)',
                  }}
                />
                <span className="text-xs text-[var(--color-text)]">Edit Curves</span>
              </div>
              <SwitchToggle value={isCurveActive} onChange={handleCurveToggle} />
            </div>

            {isCurveActive && (
              <>
                <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed">
                  Kenar ortasındaki{' '}
                  <span className="text-[var(--color-accent)] font-medium">mavi</span>{' '}
                  noktaları sürükleyerek eğri oluştur. Çift tıkla düzelt.
                </p>
                <button
                  type="button"
                  onClick={handleResetCurves}
                  className="
                    flex items-center gap-1.5 w-full
                    px-2.5 py-1.5 rounded text-xs
                    text-[var(--color-text-muted)]
                    border border-[var(--color-border)]
                    bg-[var(--color-surface-2)]
                    hover:text-[var(--color-text)]
                    hover:border-[var(--color-text-muted)]
                    transition-colors duration-150 cursor-pointer
                  "
                >
                  <RefreshIcon sx={{ fontSize: 13 }} />
                  Reset all curves
                </button>
              </>
            )}

          </div>
        </PanelSection>
      )}

    </div>
  )
}

// ─── Alt bileşenler ───────────────────────────────────────────────────────────

// Collapsible panel section
interface PanelSectionProps {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}

function PanelSection({ title, children, defaultOpen = true }: PanelSectionProps) {
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

// Visibility toggle butonu
function VisibilityToggle({ visible, onChange }: { visible: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!visible)}
      className="
        flex items-center justify-center w-7 h-7 rounded
        border border-[var(--color-border)]
        bg-[var(--color-surface)]
        hover:bg-[var(--color-surface-2)]
        transition-colors duration-100 cursor-pointer
      "
      aria-pressed={visible}
      aria-label={visible ? 'Gizle' : 'Göster'}
    >
      {visible
        ? <VisibilityIcon sx={{ fontSize: 14, color: 'var(--color-accent)' }} />
        : <VisibilityOffIcon sx={{ fontSize: 14, color: 'var(--color-text-muted)' }} />
      }
    </button>
  )
}

// Switch toggle — curves için
function SwitchToggle({ value, onChange }: { value: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      aria-pressed={value}
      className="
        relative w-9 h-5 rounded-full transition-colors duration-200
        cursor-pointer border-none outline-none
        focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]
      "
      style={{ backgroundColor: value ? 'var(--color-accent)' : 'var(--color-border)' }}
    >
      <span
        className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200"
        style={{ transform: value ? 'translateX(16px)' : 'translateX(0)' }}
      />
    </button>
  )
}