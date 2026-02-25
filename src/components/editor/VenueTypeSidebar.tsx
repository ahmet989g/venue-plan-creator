'use client'

// Sol kenar venue tipi seçim sidebari
// Her tip için ikon ve kısa label — tıklanınca initChart tetiklenir

import { useShallow } from 'zustand/react/shallow'
import { useEditorStore } from '@/store/editor.store'
import type { VenueType } from '@/store/types'

// Venue tipleri sabit listesi
const VENUE_TYPES: { type: VenueType; label: string }[] = [
  { type: 'large-theatre', label: 'Large Theatre' },
  { type: 'small-theatre', label: 'Small Theatre' },
  { type: 'gala-dinner', label: 'Gala Dinner' },
  { type: 'trade-show', label: 'Trade Show' },
]

export default function VenueTypeSidebar() {
  const { activeType, initChart } = useEditorStore(
    useShallow((s) => ({
      activeType: s.chart?.venueType ?? null,
      initChart: s.initChart,
    }))
  )

  return (
    <aside
      style={{ gridArea: 'sidebar' }}
      className="flex flex-col items-center gap-1 py-2 bg-surface border-r border-border overflow-y-auto"
    >
      {VENUE_TYPES.map(({ type, label }) => {
        const isActive = activeType === type
        return (
          <button
            key={type}
            onClick={() => initChart(type)}
            title={label}
            className={`
              flex flex-col items-center gap-1 w-18 py-2 px-1 rounded-lg border-none cursor-pointer
              transition-colors duration-150 text-text-muted
              hover:bg-surface-2 hover:text-text
              ${isActive ? 'bg-surface-2 text-accent' : 'bg-transparent'}
            `}
          >
            {/* TODO: Her venue tipi için özel ikon eklenecek */}
            <span className={`w-8 h-8 rounded-md block bg-surface-2 ${isActive ? 'opacity-80' : ''}`} />
            <span className="text-[9px] font-medium text-center leading-tight uppercase tracking-wider">
              {label}
            </span>
          </button>
        )
      })}
    </aside>
  )
}