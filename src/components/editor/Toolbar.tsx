'use client'

// Dikey araç çubuğu — venue tipine ve editing context'e göre filtrelenmiş tool listesi
//
// Normal mod (large-theatre):
//   Section tool görünür, Row/Table/Booth gizli
//
// Editing context modu (section içi):
//   Section tool gizlenir
//   Row/Table/Booth araçları ZORLA gösterilir — section içine nesne eklenebilir
//
// Hand Tool her zaman en altta separator ile ayrılır

import { useMemo } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useEditorStore } from '@/store/editor.store'
import { TOOLBAR_TOOLS } from './toolbar/constants'
import ToolItem from './toolbar/ToolItem'
import type { VenueType } from '@/store/types'

function isToolVisible(
  tool: typeof TOOLBAR_TOOLS[number],
  venueType: VenueType | null,
  isEditingSection: boolean,
): boolean {
  // Editing context aktifken — section tool gizle, row/table/booth göster
  if (isEditingSection) {
    // Section tool editing modda anlamsız — gizle
    if (tool.id === 'section') return false
    // Normalde large-theatre'de gizlenen araçları zorla göster
    if (tool.hiddenFor?.includes('large-theatre')) return true
  }

  if (!venueType) return true
  if (tool.visibleFor && !tool.visibleFor.includes(venueType)) return false
  if (tool.hiddenFor && tool.hiddenFor.includes(venueType)) return false
  return true
}

export default function Toolbar() {
  const { activeTool, venueType, isEditingSection } = useEditorStore(
    useShallow((s) => ({
      activeTool: s.activeTool,
      venueType: s.chart?.venueType ?? null,
      isEditingSection: s.editingContext?.type === 'section',
    })),
  )

  const { mainTools, bottomTool } = useMemo(() => {
    const visible = TOOLBAR_TOOLS.filter((t) =>
      isToolVisible(t, venueType, isEditingSection),
    )
    return {
      mainTools: visible.filter((t) => !t.isBottom),
      bottomTool: visible.find((t) => t.isBottom) ?? null,
    }
  }, [venueType, isEditingSection])

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