// Toolbar tool listesi ve venue tipi görünürlük kuralları
// visibleFor tanımsız → tüm venue tiplerinde görünür
// hiddenFor → belirtilen tiplerde gizlenir

import type { ToolDefinition } from './types'

export const TOOLBAR_TOOLS: ToolDefinition[] = [
  // --- Ortak toollar ---
  {
    id:       'select',
    icon:     'icon-select-cursor',
    label:    'Select Tool',
    shortcut: 'V',
  },
  {
    id:       'select-seats',
    icon:     'icon-select-seats',
    label:    'Select Seats Tool',
    shortcut: 'A',
  },
  {
    id:       'selection-brush',
    icon:     'icon-select-brush',
    label:    'Selection Brush',
    shortcut: 'B',
  },
  {
    id:       'select-same-type',
    icon:     'icon-select-sameType',
    label:    'Select Same Type',
    shortcut: 'Q',
  },
  {
    id:       'node',
    icon:     'icon-node',
    label:    'Node Tool',
    shortcut: 'N',
  },
  {
    id:       'focal-point',
    icon:     'icon-focalpoint',
    label:    'Focal Point',
    shortcut: 'F',
  },

  // --- Section Tool — sadece Large Theatre ---
  {
    id:          'section',
    icon:        'icon-section-polygon',
    label:       'Section Tools',
    shortcut:    'S',
    visibleFor:  ['large-theatre'],
    dropdown: [
      { id: 'section',             icon: 'icon-section-polygon',   label: 'Section Tool'             },
      { id: 'rectangular-section', icon: 'icon-section-rectangle', label: 'Rectangular Section Tool' },
    ],
  },

  // --- Row Tools — Large Theatre'de gizli ---
  {
    id:        'row',
    icon:      'icon-row-single',
    label:     'Row Tools',
    shortcut:  'W',
    hiddenFor: ['large-theatre'],
    dropdown: [
      { id: 'row',           icon: 'icon-row-single',    label: 'Row Tool'           },
      { id: 'multiple-row',  icon: 'icon-row-multiple',  label: 'Multiple Rows Tool' },
    ],
  },

  // --- Table Tools — Large Theatre'de gizli ---
  {
    id:        'round-table',
    icon:      'icon-table-round',
    label:     'Table Tools',
    shortcut:  'U',
    hiddenFor: ['large-theatre'],
    dropdown: [
      { id: 'round-table',       icon: 'icon-table-round',     label: 'Round Table Tool'       },
      { id: 'rectangular-table', icon: 'icon-table-rectangle', label: 'Rectangular Table Tool' },
    ],
  },

  // --- Booth Tool — Large Theatre'de gizli ---
  {
    id:        'booth',
    icon:      'icon-booth',
    label:     'Booth Tool',
    shortcut:  'H',
    hiddenFor: ['large-theatre'],
  },

  // --- Area Tools ---
  {
    id:       'area',
    icon:     'icon-ga-rectangle',
    label:    'Area Tools',
    shortcut: 'G',
    dropdown: [
      { id: 'area', icon: 'icon-ga-rectangle', label: 'Rectangular Area Tool' },
      { id: 'area', icon: 'icon-ga-ellipse',   label: 'Elliptic Area Tool'    },
      { id: 'area', icon: 'icon-ga-polygon',   label: 'Polygonal Area Tool'   },
    ],
  },

  // --- Shape Tools ---
  {
    id:       'rectangle',
    icon:     'icon-shape-rectangle',
    label:    'Shape Tools',
    shortcut: 'R',
    dropdown: [
      { id: 'rectangle', icon: 'icon-shape-rectangle', label: 'Rectangle Tool' },
      { id: 'rectangle', icon: 'icon-shape-ellipse',   label: 'Ellipse Tool'   },
      { id: 'rectangle', icon: 'icon-shape-polygon',   label: 'Polygon Tool'   },
    ],
  },

  // --- Tekil toollar ---
  {
    id:       'line',
    icon:     'icon-line',
    label:    'Line Tool',
    shortcut: 'L',
  },
  {
    id:       'text',
    icon:     'icon-text',
    label:    'Text Tool',
    shortcut: 'T',
  },
  {
    id:       'image',
    icon:     'icon-image',
    label:    'Image Tool',
    shortcut: 'I',
  },
  {
    id:       'icon',
    icon:     'icon-restrooms-unisex',
    label:    'Icons Tool',
    shortcut: 'O',
  },

  // --- Hand Tool — her zaman en altta ---
  {
    id:       'hand',
    icon:     'icon-hand',
    label:    'Hand Tool',
    shortcut: 'H',
    isBottom: true,
  },
]