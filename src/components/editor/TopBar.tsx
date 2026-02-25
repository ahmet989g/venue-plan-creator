'use client'

// Editör üst çubuğu
// Soldan sağa: Plan adı (inline edit) · Undo/Redo · Grid · Snap · Delete · Preview · Publish

import { useShallow } from 'zustand/react/shallow'
import { IconButton, Tooltip } from '@mui/material'
import UndoIcon from '@mui/icons-material/Undo'
import RedoIcon from '@mui/icons-material/Redo'
import GridOnIcon from '@mui/icons-material/GridOn'
import GridOffIcon from '@mui/icons-material/GridOff'
import DeleteIcon from '@mui/icons-material/Delete'
import { useEditorStore, useCanUndo, useCanRedo } from '@/store/editor.store'

export default function TopBar() {
  const {
    chartName,
    isGridVisible,
    isSnapEnabled,
    setChartName,
    toggleGrid,
    toggleSnap,
    removeSelectedObjects,
    undo,
    redo,
    publish,
  } = useEditorStore(
    useShallow((s) => ({
      chartName: s.chart?.name ?? '',
      isGridVisible: s.isGridVisible,
      isSnapEnabled: s.isSnapEnabled,
      setChartName: s.setChartName,
      toggleGrid: s.toggleGrid,
      toggleSnap: s.toggleSnap,
      removeSelectedObjects: s.removeSelectedObjects,
      undo: s.undo,
      redo: s.redo,
      publish: s.publish,
    }))
  )

  const canUndo = useCanUndo()
  const canRedo = useCanRedo()

  // Ortak ikon buton sınıfları
  const iconBtnSx = { color: 'var(--color-text-muted)' }

  return (
    <div
      style={{ gridArea: 'topbar' }}
      className="flex items-center justify-between px-3 gap-2 bg-surface border-b border-border"
    >
      {/* Sol — plan adı */}
      <div className="flex items-center gap-2">
        <input
          value={chartName}
          onChange={(e) => setChartName(e.target.value)}
          placeholder="Untitled Plan"
          spellCheck={false}
          className="bg-transparent border border-transparent rounded px-1.5 py-0.5 text-[13px] font-medium text-text outline-none min-w-30 hover:border-border focus:border-accent transition-colors duration-150"
        />
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

        <div className="w-px h-4.5 bg-border mx-1" />

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
            {/* TODO: Snap ikonu özel font paketinden gelecek */}
            <span className="text-[11px] font-bold leading-none">S</span>
          </IconButton>
        </Tooltip>

        <div className="w-px h-4.5 bg-border mx-1" />

        <Tooltip title="Seçili Nesneleri Sil (Delete)">
          <IconButton size="small" onClick={removeSelectedObjects}>
            <DeleteIcon fontSize="small" sx={iconBtnSx} />
          </IconButton>
        </Tooltip>
      </div>

      {/* Sağ — preview + publish */}
      <div className="flex items-center gap-2">
        <button className="px-3 py-1 rounded-md text-[12px] font-medium cursor-pointer border border-border bg-transparent text-text hover:bg-surface-2 transition-colors duration-150">
          Preview
        </button>

        <button
          onClick={publish}
          className="px-3 py-1 rounded-md text-[12px] font-semibold cursor-pointer bg-accent border-none text-white hover:opacity-90 transition-opacity duration-150"
        >
          Publish
        </button>
      </div>
    </div>
  )
}