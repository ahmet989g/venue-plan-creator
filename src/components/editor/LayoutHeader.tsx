'use client'

// Uygulamanın en üst barı
// Sol: uygulama adı, Sağ: dark/light tema toggle
// mounted kontrolü — next-themes SSR'da theme undefined döner, hydration hatası önlenir

import { useEffect, useState } from 'react'
import { useTheme } from '@/hooks/useTheme'
import { IconButton, Tooltip } from '@mui/material'
import LightModeIcon from '@mui/icons-material/LightMode'
import DarkModeIcon from '@mui/icons-material/DarkMode'

export default function LayoutHeader() {
  const { theme, toggleTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <header
      style={{ gridArea: 'header' }}
      className="flex items-center justify-between px-4 bg-surface border-b border-border"
    >
      <span className="text-[13px] font-bold tracking-widest uppercase text-text">
        Venue Creator
      </span>

      {/* Mount olmadan tema butonunu render etme — sunucu/client uyuşmazlığı olmaz */}
      {mounted && (
        <Tooltip title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}>
          <IconButton onClick={toggleTheme} size="small">
            {theme === 'dark'
              ? <LightModeIcon fontSize="small" sx={{ color: 'var(--color-text-muted)' }} />
              : <DarkModeIcon fontSize="small" sx={{ color: 'var(--color-text-muted)' }} />
            }
          </IconButton>
        </Tooltip>
      )}
    </header>
  )
}