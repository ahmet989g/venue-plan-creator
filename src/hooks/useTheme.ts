'use client'

// Tema hook — next-themes'i wrap eder
// Kullanım: const { theme, toggleTheme } = useTheme()

import { useTheme as useNextTheme } from 'next-themes'

export function useTheme() {
  const { theme, setTheme } = useNextTheme()

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  return {
    theme: (theme ?? 'dark') as 'dark' | 'light',
    toggleTheme,
  }
}