'use client'

// Reusable properties satır bileşeni — label + input ikilisi
// Tüm properties panellerinde (Row, Table, Section vb.) kullanılır

import type { ReactNode } from 'react'

interface PropertyRowProps {
  label: string
  children: ReactNode
  // İsteğe bağlı açıklama metni — label'ın altında küçük gri yazı
  hint?: string
}

export default function PropertyRow({ label, children, hint }: PropertyRowProps) {
  return (
    <div className="flex items-center justify-between gap-2 py-1.5 min-h-[32px]">
      <div className="flex flex-col shrink-0">
        <span className="text-xs text-[var(--color-text-muted)] leading-tight">
          {label}
        </span>
        {hint && (
          <span className="text-[10px] text-[var(--color-text-muted)] opacity-60 leading-tight mt-0.5">
            {hint}
          </span>
        )}
      </div>
      {children}
    </div>
  )
}