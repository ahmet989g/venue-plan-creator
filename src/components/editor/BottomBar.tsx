'use client'

// Alt bilgi çubuğu
// Aktif tool'a göre keyboard shortcut listesini gösterir
// Modifier key basılıyken kbd highlighted olur

import { useEffect, useState } from 'react'
import { useEditorStore } from '@/store/editor.store'
import type { ToolType } from '@/store/types'

interface Shortcut {
  key: string
  label: string
  modifier?: 'shift' | 'ctrl' | 'alt'   // Basılıyken highlight olacak modifier
}

const TOOL_SHORTCUTS: Partial<Record<ToolType, Shortcut[]>> = {
  select: [
    { key: 'Click', label: 'Select' },
    { key: 'Shift', label: 'Multi select', modifier: 'shift' },
    { key: 'Drag', label: 'Lasso' },
  ],
  hand: [
    { key: 'Drag', label: 'Pan canvas' },
  ],
  row: [
    { key: 'Click', label: 'Place row' },
    { key: 'Shift', label: 'Snap to 15°', modifier: 'shift' },
    { key: 'Alt', label: 'Disabled snapping', modifier: 'alt' },
    { key: 'Esc', label: 'Cancel' },
  ],
  section: [
    { key: 'Click', label: 'Add point' },
    { key: 'Dbl Clk', label: 'Close section' },
  ],
}

const COMMON_SHORTCUTS: Shortcut[] = [
  { key: 'Ctrl+Z', label: 'Undo', modifier: 'ctrl' },
  { key: 'Ctrl+Shift+Z', label: 'Redo', modifier: 'ctrl' },
  { key: 'Space', label: 'Pan' },
  { key: 'Del', label: 'Delete' },
]

export default function BottomBar() {
  const activeTool = useEditorStore((s) => s.activeTool)
  const toolShortcuts = TOOL_SHORTCUTS[activeTool] ?? []

  // Basılı modifier tuşlarını takip et
  const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set())

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      setPressedKeys((prev) => {
        const next = new Set(prev)
        if (e.shiftKey) next.add('shift')
        if (e.ctrlKey || e.metaKey) next.add('ctrl')
        if (e.altKey) next.add('alt')
        return next
      })
    }

    const onKeyUp = (e: KeyboardEvent) => {
      setPressedKeys((prev) => {
        const next = new Set(prev)
        if (!e.shiftKey) next.delete('shift')
        if (!e.ctrlKey && !e.metaKey) next.delete('ctrl')
        if (!e.altKey) next.delete('alt')
        return next
      })
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])

  const isHighlighted = (shortcut: Shortcut) =>
    shortcut.modifier ? pressedKeys.has(shortcut.modifier) : false

  const renderShortcut = (s: Shortcut) => (
    <div key={s.key + s.label} className="flex items-center gap-1.5">
      <kbd className={`
        text-[9px] font-mono font-semibold px-1.5 py-px rounded
        border transition-colors duration-100
        ${isHighlighted(s)
          ? 'border-accent bg-accent/20 text-accent'
          : 'border-border bg-surface-2 text-text'
        }
      `}>
        {s.key}
      </kbd>
      <span className="text-[10px] text-text-muted">{s.label}</span>
    </div>
  )

  return (
    <footer
      style={{ gridArea: 'bottombar' }}
      className="flex items-center px-3 gap-0 bg-surface border-t border-border overflow-hidden"
    >
      <div className="flex items-center gap-3">
        {toolShortcuts.map(renderShortcut)}
      </div>

      {toolShortcuts.length > 0 && (
        <div className="w-px h-3.5 bg-border mx-3" />
      )}

      <div className="flex items-center gap-3">
        {COMMON_SHORTCUTS.map(renderShortcut)}
      </div>
    </footer>
  )
}