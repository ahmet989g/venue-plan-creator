// Canvas slice — viewport ve canvas UI state yönetimi
// Pan, zoom, grid, snap toggle'ları burada yaşar

import type { StateCreator } from 'zustand'
import type { EditorStore } from '../editor.store'
import type { Viewport } from '../types'

export interface CanvasSlice {
  // State
  viewport:      Viewport
  isGridVisible: boolean
  isSnapEnabled: boolean
  isPanning:     boolean
  isInteracting: boolean  // Drag veya rotate süresince true — handle'lar gizlenir

  // Actions
  setViewport:   (viewport: Viewport) => void
  toggleGrid:    () => void
  toggleSnap:    () => void
  setIsPanning:  (value: boolean) => void
  setInteracting:(value: boolean) => void
}

export const createCanvasSlice: StateCreator<
  EditorStore,
  [['zustand/immer', never]],
  [],
  CanvasSlice
> = (set) => ({
  viewport:      { x: 0, y: 0, scale: 1 },
  isGridVisible: true,
  isSnapEnabled: true,
  isPanning:     false,
  isInteracting: false,

  setViewport: (viewport) => {
    set((state) => { state.viewport = viewport })
  },

  toggleGrid: () => {
    set((state) => { state.isGridVisible = !state.isGridVisible })
  },

  toggleSnap: () => {
    set((state) => { state.isSnapEnabled = !state.isSnapEnabled })
  },

  setIsPanning: (value) => {
    set((state) => { state.isPanning = value })
  },

  setInteracting: (value) => {
    set((state) => { state.isInteracting = value })
  },
})