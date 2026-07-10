import { useState, useRef, useEffect } from 'react'

interface EmojiEditorProps {
  current: string
  onSave: (emoji: string) => void
  onClose: () => void
}

export function EmojiEditor({ current, onSave, onClose }: EmojiEditorProps) {
  const [value, setValue] = useState(current)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSave = () => {
    const trimmed = value.trim()
    if (trimmed) {
      onSave(trimmed)
    }
    onClose()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave()
    }
    if (e.key === 'Escape') {
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      style={{ background: 'var(--color-overlay)' }}
    >
      <div
        className="bg-canvas rounded-2xl p-6 w-72 shadow-xl border border-border animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-center text-5xl mb-3 select-all">{value || '📝'}</p>

        <label className="text-xs text-body font-medium block mb-2 text-center">
          Pegá o escribí tu emoji
        </label>

        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="ej: 🍕"
          maxLength={10}
          className="
            w-full text-center text-xl p-3
            rounded-xl
            bg-canvas-soft border border-border
            placeholder:text-mute
            focus:border-primary
            transition-colors
          "
        />

        <div className="flex gap-2 mt-4">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-canvas-soft text-body border border-border active:scale-95 transition-transform"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={!value.trim()}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-primary text-on-primary active:scale-95 transition-transform disabled:opacity-50"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  )
}
