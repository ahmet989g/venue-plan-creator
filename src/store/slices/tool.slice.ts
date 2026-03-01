// Tool slice — aktif araç ve geçici araç geçiş yönetimi
// setTemporaryTool: Space+drag gibi geçici tool switch için
// restorePreviousTool: geçici tooldan önceki tool'a dönmek için

import type { StateCreator } from 'zustand'
import type { EditorStore } from '../editor.store'
import type { ToolType } from '../types'

export interface ToolSlice {
  // State
  activeTool:   ToolType
  previousTool: ToolType | null

  // Actions
  setActiveTool:       (tool: ToolType) => void
  setTemporaryTool:    (tool: ToolType) => void
  restorePreviousTool: () => void
}

export const createToolSlice: StateCreator<
  EditorStore,
  [['zustand/immer', never]],
  [],
  ToolSlice
> = (set) => ({
  activeTool:   'select',
  previousTool: null,

  setActiveTool: (tool) => {
    set((state) => {
      state.activeTool   = tool
      state.previousTool = null
    })
  },

  setTemporaryTool: (tool) => {
    set((state) => {
      state.previousTool = state.activeTool
      state.activeTool   = tool
    })
  },

  restorePreviousTool: () => {
    set((state) => {
      if (state.previousTool) {
        state.activeTool   = state.previousTool
        state.previousTool = null
      }
    })
  },
})