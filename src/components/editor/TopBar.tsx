'use client'

// Editör üst çubuğu
//
// Normal mod:
//   Sol  → Plan adı (inline edit)
//   Orta → Undo/Redo · Grid · Snap · Delete
//   Sağ  → Preview · Publish
//
// Editing context (section içi) modu:
//   Sol  → Breadcrumb: Plan adı › Section adı
//   Orta → araçlar aynı
//   Sağ  → Exit Section butonu + Preview · Publish

import { useCallback } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { IconButton, Tooltip } from '@mui/material'
import UndoIcon from '@mui/icons-material/Undo'
import RedoIcon from '@mui/icons-material/Redo'
import GridOnIcon from '@mui/icons-material/GridOn'
import GridOffIcon from '@mui/icons-material/GridOff'
import DeleteIcon from '@mui/icons-material/Delete'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import { useEditorStore, useCanUndo, useCanRedo } from '@/store/editor.store'

export default function TopBar() {
  const {
    chartName,
    isGridVisible,
    isSnapEnabled,
    editingContext,
    setChartName,
    toggleGrid,
    toggleSnap,
    removeSelectedObjects,
    exitSectionContext,
    undo,
    redo,
    publish,
  } = useEditorStore(
    useShallow((s) => ({
      chartName: s.chart?.name ?? '',
      isGridVisible: s.isGridVisible,
      isSnapEnabled: s.isSnapEnabled,
      editingContext: s.editingContext,
      setChartName: s.setChartName,
      toggleGrid: s.toggleGrid,
      toggleSnap: s.toggleSnap,
      removeSelectedObjects: s.removeSelectedObjects,
      exitSectionContext: s.exitSectionContext,
      undo: s.undo,
      redo: s.redo,
      publish: s.publish,
    })),
  )

  const canUndo = useCanUndo()
  const canRedo = useCanRedo()

  // Editing context'teyken hangi section içindeyiz?
  const activeSectionLabel = useEditorStore((s) => {
    if (s.editingContext?.type !== 'section') return null
    const floor = s.chart?.floors.find((f) => f.id === s.editingContext?.floorId)
    const section = floor?.sections.find((sec) => sec.id === s.editingContext?.sectionId)
    return section?.label || 'Section'
  })

  const isInSectionContext = editingContext?.type === 'section'

  const iconBtnSx = { color: 'var(--color-text-muted)' }

  const handleExit = useCallback(() => {
    exitSectionContext()
  }, [exitSectionContext])

  return (
    <div
      style={{ gridArea: 'topbar' }}
      className="flex items-center justify-between px-3 gap-2 bg-surface border-b border-border h-10"
    >
      {/* Sol — plan adı veya breadcrumb */}
      <div className="flex items-center gap-1.5 min-w-0">
        {isInSectionContext ? (
          // Editing context breadcrumb
          <div className="flex items-center gap-1 text-[13px] min-w-0">
            <span className="text-text-muted truncate max-w-32">{chartName || 'Untitled Plan'}</span>
            <ChevronRightIcon sx={{ fontSize: 14, color: 'var(--color-text-muted)' }} />
            <span
              className="font-semibold text-text truncate max-w-40"
              style={{ color: 'var(--color-accent)' }}
            >
              {activeSectionLabel}
            </span>
          </div>
        ) : (
          // Normal plan adı — inline edit
          <input
            value={chartName}
            onChange={(e) => setChartName(e.target.value)}
            placeholder="Untitled Plan"
            spellCheck={false}
            className="
              bg-transparent border border-transparent rounded
              px-1.5 py-0.5 text-[13px] font-medium text-text
              outline-none min-w-30
              hover:border-border focus:border-accent
              transition-colors duration-150
            "
          />
        )}
      </div>

      {/* Orta — araçlar */}
      <div className="flex items-center gap-1">
        <Tooltip title="Undo (Ctrl+Z)">
          <span>
            <IconButton size="small" onClick={undo} disabled={!canUndo}>
              <UndoIcon fontSize="small" sx={iconBtnSx} />
            </IconButton>
          </span>
        </Tooltip>

        <Tooltip title="Redo (Ctrl+Shift+Z)">
          <span>
            <IconButton size="small" onClick={redo} disabled={!canRedo}>
              <RedoIcon fontSize="small" sx={iconBtnSx} />
            </IconButton>
          </span>
        </Tooltip>

        <div className="w-px h-4 bg-border mx-1" />

        <Tooltip title={isGridVisible ? 'Grid Kapat' : 'Grid Aç'}>
          <IconButton size="small" onClick={toggleGrid}>
            {isGridVisible
              ? <GridOnIcon fontSize="small" sx={iconBtnSx} />
              : <GridOffIcon fontSize="small" sx={iconBtnSx} />
            }
          </IconButton>
        </Tooltip>

        <Tooltip title={isSnapEnabled ? 'Snap Kapat' : 'Snap Aç'}>
          <IconButton
            size="small"
            onClick={toggleSnap}
            sx={{ color: isSnapEnabled ? 'var(--color-accent)' : 'var(--color-text-muted)' }}
          >
            <span className="text-[11px] font-bold leading-none">S</span>
          </IconButton>
        </Tooltip>

        <div className="w-px h-4 bg-border mx-1" />

        <Tooltip title="Seçili Nesneleri Sil (Delete)">
          <IconButton size="small" onClick={removeSelectedObjects}>
            <DeleteIcon fontSize="small" sx={iconBtnSx} />
          </IconButton>
        </Tooltip>
      </div>

      {/* Sağ — Exit Section (context'teyken) + Preview + Publish */}
      <div className="flex items-center gap-2">
        {isInSectionContext && (
          <button
            onClick={handleExit}
            className="
              flex items-center gap-1 px-3 py-1 rounded-md
              text-[12px] font-medium cursor-pointer
              border border-accent text-accent
              bg-transparent hover:bg-accent hover:text-white
              transition-colors duration-150
            "
          >
            <span>↩</span>
            <span>Exit Section</span>
          </button>
        )}

        <button className="
          px-3 py-1 rounded-md text-[12px] font-medium cursor-pointer
          border border-border bg-transparent text-text
          hover:bg-surface-2 transition-colors duration-150
        ">
          Preview
        </button>

        <button
          onClick={publish}
          className="
            px-3 py-1 rounded-md text-[12px] font-semibold cursor-pointer
            bg-accent border-none text-white
            hover:opacity-90 transition-opacity duration-150
          "
        >
          Publish
        </button>
      </div>
    </div>
  )
}