'use client'

// Dikey araç çubuğu — venue tipine göre filtrelenmiş tool listesi
// Hand Tool her zaman en altta separator ile ayrılır

import { useMemo } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useEditorStore } from '@/store/editor.store'
import { TOOLBAR_TOOLS } from './toolbar/constants'
import ToolItem from './toolbar/ToolItem'
import type { VenueType } from '@/store/types'

// Venue tipine göre tool görünürlüğünü kontrol et
function isToolVisible(
  tool: typeof TOOLBAR_TOOLS[number],
  venueType: VenueType | null,
): boolean {
  if (!venueType) return true
  if (tool.visibleFor && !tool.visibleFor.includes(venueType)) return false
  if (tool.hiddenFor && tool.hiddenFor.includes(venueType)) return false
  return true
}

export default function Toolbar() {
  const { activeTool, venueType } = useEditorStore(
    useShallow((s) => ({
      activeTool: s.activeTool,
      venueType: s.chart?.venueType ?? null,
    })),
  )

  const { mainTools, bottomTool } = useMemo(() => {
    const visible = TOOLBAR_TOOLS.filter((t) => isToolVisible(t, venueType))
    return {
      mainTools: visible.filter((t) => !t.isBottom),
      bottomTool: visible.find((t) => t.isBottom) ?? null,
    }
  }, [venueType])

  // Aktif tool'un parent tool'una göre active state belirle
  const isToolActive = (tool: typeof TOOLBAR_TOOLS[number]) => {
    if (tool.id === activeTool) return true
    return tool.dropdown?.some((d) => d.id === activeTool) ?? false
  }

  return (
    <aside
      style={{ gridArea: 'toolbar' }}
      className="flex flex-col justify-between items-center py-2 bg-surface-2 border-r border-border"
    >
      <div className="flex flex-col items-center gap-0.5">
        {mainTools.map((tool) => (
          <ToolItem
            key={tool.id}
            tool={tool}
            isActive={isToolActive(tool)}
          />
        ))}
      </div>

      {bottomTool && (
        <div className="flex flex-col items-center gap-1 w-full">
          <div className="w-7 h-px bg-border" />
          <ToolItem
            tool={bottomTool}
            isActive={isToolActive(bottomTool)}
          />
        </div>
      )}
    </aside>
  )
}