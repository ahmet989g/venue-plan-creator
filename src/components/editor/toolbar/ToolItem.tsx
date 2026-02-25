'use client'

// Toolbar'daki tekil tool butonu
// Dropdown varsa tıklayınca açılır, dışarı tıklayınca kapanır
// İkon: span.icon.{icon-name} formatında özel font ikonu

import { useState, useRef, useEffect, useCallback } from 'react'
import { Tooltip } from '@mui/material'
import { useEditorStore } from '@/store/editor.store'
import type { ToolDefinition } from './types'
import type { ToolType } from '@/store/types'

interface ToolItemProps {
  tool: ToolDefinition
  isActive: boolean
}

export default function ToolItem({ tool, isActive }: ToolItemProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeIcon, setActiveIcon] = useState(tool.icon)
  const containerRef = useRef<HTMLDivElement>(null)
  const setActiveTool = useEditorStore((s) => s.setActiveTool)

  const hasDropdown = Boolean(tool.dropdown?.length)

  // Dışarı tıklayınca dropdown'ı kapat
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const handleMainClick = useCallback(() => {
    if (hasDropdown) {
      // İlk alt tool'u aktif et, dropdown'ı aç
      setActiveTool(tool.dropdown![0].id)
      setIsOpen((prev) => !prev)
    } else {
      setActiveTool(tool.id)
    }
  }, [hasDropdown, tool, setActiveTool])

  const handleDropdownSelect = useCallback(
    (id: ToolType, icon: string) => {
      setActiveTool(id)
      setActiveIcon(icon)
      setIsOpen(false)
    },
    [setActiveTool],
  )

  return (
    <div ref={containerRef} className="relative">
      <Tooltip
        title={`${tool.label}${tool.shortcut ? ` (${tool.shortcut})` : ''}`}
        placement="right"
      >
        <button
          onClick={handleMainClick}
          className={`
            w-9 h-9 flex items-center justify-center rounded-md border-none cursor-pointer
            transition-colors duration-150
            ${isActive
              ? 'bg-accent text-white'
              : 'bg-transparent text-text-muted hover:bg-surface hover:text-text'
            }
          `}
        >
          <span className={`icon ${activeIcon} text-2xl leading-none`} />
          {hasDropdown && (
            <span className="icon icon-tool-group-indicator text-[10px] leading-none absolute -right-1.5 top-1/2 -translate-y-1/2" />
          )}
        </button>
      </Tooltip>

      {/* Dropdown */}
      {hasDropdown && isOpen && (
        <div className="
          absolute left-full top-0 ml-4 z-50
          flex flex-col gap-0.5 p-1
          bg-surface-2 border border-border rounded-lg shadow-lg
        ">
          {tool.dropdown!.map((item) => (
            <button
              key={`${item.id}-${item.icon}`}
              onClick={() => handleDropdownSelect(item.id, item.icon)}
              className="
                flex items-center gap-2.5 px-2.5 py-1.5 rounded-md
                text-[12px] text-text-muted border-none bg-transparent
                cursor-pointer text-left w-full
                hover:bg-surface hover:text-text transition-colors duration-100
              "
            >
              <span className={`icon ${item.icon} text-2xl leading-none shrink-0`} />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}