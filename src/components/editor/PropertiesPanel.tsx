'use client'

// Properties paneli — aktif tool veya seçili objeye göre ilgili bileşeni render eder
// Yeni tool/obje properties eklenince sadece buraya import + koşul eklenir

import { useEditorStore } from '@/store/editor.store'
import RowToolProperties from './properties/RowToolProperties'

export default function PropertiesPanel() {
  const activeTool = useEditorStore((s) => s.activeTool)

  return (
    <aside className="h-full w-80 shrink-0 border-l border-border bg-surface overflow-y-auto" style={{ gridArea: 'panel' }}>
      {activeTool === 'row' && <RowToolProperties />}

      {/* Todo: seçili obje properties — table, booth, section vb. */}
    </aside>
  )
}