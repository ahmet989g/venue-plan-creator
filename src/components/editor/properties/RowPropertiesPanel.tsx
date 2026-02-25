'use client'

// Row Properties Panel — row seçildiğinde sağ panelde gösterilen özellikler
// Bu dosya Category section'ı içeriyor. Diğer bölümler (Row, Seat Labeling vb.)
// ayrı componentler olarak eklenerek buraya import edilecek.

import { CategorySelectbox } from './category/CategorySelectbox'

export function RowPropertiesPanel() {
  return (
    <div className="flex flex-col h-full">
      {/* Panel başlığı */}
      <div className="px-4 py-2.5 border-b border-[var(--color-border)]">
        <span className="text-xs font-semibold tracking-widest text-[var(--color-text-muted)] uppercase">
          Row
        </span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* ---- Category ---- */}
        <section className="px-4 py-4 border-b border-[var(--color-border)]">
          <CategorySelectbox />
        </section>

        {/* ---- Row (sonraki adım) ---- */}
        {/* <section className="px-4 py-4 border-b border-[var(--color-border)]">
          <RowSection />
        </section> */}

        {/* ---- Section Labeling (sonraki adım) ---- */}
        {/* <section className="px-4 py-4 border-b border-[var(--color-border)]">
          <SectionLabelingSection />
        </section> */}

        {/* ---- Row Labeling (sonraki adım) ---- */}
        {/* <section className="px-4 py-4 border-b border-[var(--color-border)]">
          <RowLabelingSection />
        </section> */}

        {/* ---- Seat Labeling (sonraki adım) ---- */}
        {/* <section className="px-4 py-4">
          <SeatLabelingSection />
        </section> */}
      </div>
    </div>
  )
}