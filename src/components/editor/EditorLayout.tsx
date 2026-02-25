'use client'

// Editör ana layout bileşeni
// CSS Grid ile tüm bölgeler konumlanır — Tailwind grid kullanılıyor

import LayoutHeader from './LayoutHeader'
import VenueTypeSidebar from './VenueTypeSidebar'
import Toolbar from './Toolbar'
import TopBar from './TopBar'
import EditorCanvas from './EditorCanvas'
import PropertiesPanel from './PropertiesPanel'
import BottomBar from './BottomBar'
import { useEditorStore } from '@/store/editor.store'
import { useShallow } from 'zustand/react/shallow'

export default function EditorLayout() {
  const { activeType } = useEditorStore(
    useShallow((s) => ({
      activeType: s.chart?.venueType ?? null,
    })),
  );

  return (
    <div
      className="grid h-screen overflow-hidden"
      style={{
        gridTemplateColumns: '88px 48px 1fr 320px',
        gridTemplateRows: '48px 40px 1fr 32px',
        gridTemplateAreas: `
          "header  header  header     header"
          "sidebar topbar topbar     panel"
          "sidebar toolbar canvas     panel"
          "sidebar toolbar bottombar  panel"
        `,
      }}
    >
      <LayoutHeader />
      <VenueTypeSidebar />
      {activeType &&
        (
          <>
            <Toolbar />
            <TopBar />
            <EditorCanvas />
            <PropertiesPanel />
            <BottomBar />
          </>
        )
      }
      {!activeType && (
        <div className="w-screen h-screen flex items-center justify-center">
          <p className="text-text-white text-lg">Bir Sahne Planı Türü Seçiniz!</p>
        </div>
      )}
    </div>
  )
}