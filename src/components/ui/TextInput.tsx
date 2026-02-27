'use client'

// Reusable tek satır text input
// Section label, Row label, plan adı gibi metin alanları için kullanılır
// modified prop: varsayılan değerden farklıysa accent rengi ile vurgular

import { useRef, useCallback } from 'react'

interface TextInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  modified?: boolean   // Varsayılandan farklıysa accent rengiyle vurgula
  maxLength?: number
  className?: string
}

export default function TextInput({
  value,
  onChange,
  placeholder = '',
  modified = false,
  maxLength,
  className = '',
}: TextInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value)
    },
    [onChange],
  )

  // Enter veya Escape'de blur
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === 'Escape') {
      inputRef.current?.blur()
    }
  }, [])

  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      maxLength={maxLength}
      className={[
        'h-7 w-[104px] px-2 rounded-md text-xs',
        'bg-[var(--color-surface)] border border-[var(--color-border)]',
        'outline-none transition-colors duration-100',
        'placeholder:text-[var(--color-text-muted)]',
        'focus:border-[var(--color-accent)]',
        modified
          ? 'text-[var(--color-accent)]'
          : 'text-[var(--color-text)]',
        className,
      ].join(' ')}
    />
  )
}