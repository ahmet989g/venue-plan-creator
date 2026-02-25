'use client'

// Row Tool properties paneli
// Row spacing: çizim sırasında preview snap mesafesi
// Seat spacing: koltuklar arası boşluk

import { useShallow } from 'zustand/react/shallow'
import { useEditorStore } from '@/store/editor.store'
import NumberInput from '@/components/ui/NumberInput'
import { DEFAULT_ROW_SPACING, DEFAULT_SEAT_SPACING } from '@/lib/constants'



export default function RowToolProperties() {
  const { rowToolSettings, setRowToolSettings } = useEditorStore(
    useShallow((s) => ({
      rowToolSettings: s.rowToolSettings,
      setRowToolSettings: s.setRowToolSettings,
    })),
  )

  return (
    <div className="px-3 py-3">
      <p className="text-xs font-semibold text-[var(--color-text)] mb-3">Row tool</p>

      <div className="flex flex-col gap-0.5">
        <PropertyRow label="Row spacing">
          <NumberInput
            value={rowToolSettings.rowSpacing}
            onChange={(v) => setRowToolSettings({ rowSpacing: v })}
            min={1}
            max={200}
            unit="pt"
            modified={rowToolSettings.rowSpacing !== DEFAULT_ROW_SPACING}
          />
        </PropertyRow>

        <PropertyRow label="Seat spacing">
          <NumberInput
            value={rowToolSettings.seatSpacing}
            onChange={(v) => setRowToolSettings({ seatSpacing: v })}
            min={1}
            max={200}
            unit="pt"
            modified={rowToolSettings.seatSpacing !== DEFAULT_SEAT_SPACING}
          />
        </PropertyRow>
      </div>
    </div>
  )
}

function PropertyRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1.5">
      <span className="text-xs text-[var(--color-text-muted)] shrink-0">{label}</span>
      {children}
    </div>
  )
}