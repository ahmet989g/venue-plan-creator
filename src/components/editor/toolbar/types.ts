// Toolbar tip tanımları

import type { VenueType, ToolType } from '@/store/types'

export interface DropdownToolItem {
  id:       ToolType
  icon:     string
  label:    string
}

export interface ToolDefinition {
  id:           ToolType
  icon:         string
  label:        string
  shortcut?:    string
  isBottom?:    boolean           // Hand tool — her zaman en altta
  dropdown?:    DropdownToolItem[]
  visibleFor?:  VenueType[]       // Tanımsızsa tüm venue tiplerinde görünür
  hiddenFor?:   VenueType[]       // Belirtilen venue tiplerinde gizlenir
}