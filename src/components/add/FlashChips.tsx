import { useMemo } from 'react'
import { getFlashSuggestions } from '../../lib/flash'

interface FlashChipsProps {
  onSelect: (text: string) => void
  /** Max number of chips to show (defaults to 6) */
  maxChips?: number
}

export function FlashChips({ onSelect, maxChips = 6 }: FlashChipsProps) {
  const suggestions = useMemo(() => getFlashSuggestions(), [])

  const chips = useMemo(() => {
    // Remove duplicates (by text) and limit to maxChips
    const seen = new Set<string>()
    return suggestions.filter((s) => {
      if (seen.has(s.text)) return false
      seen.add(s.text)
      return true
    }).slice(0, maxChips)
  }, [suggestions, maxChips])

  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
      {chips.map((chip) => (
        <button
          key={chip.text}
          type="button"
          onClick={() => onSelect(chip.text)}
          className="
            shrink-0 flex items-center gap-1.5
            px-3.5 py-2.5 rounded-full text-sm font-medium
            bg-canvas-soft border border-border text-body
            hover:bg-card-hover active:scale-95
            transition-all touch-manipulation
            min-h-[44px]
          "
          aria-label={`Sugerir ${chip.label}`}
        >
          <span className="text-base">{chip.emoji}</span>
          <span>{chip.label}</span>
        </button>
      ))}
    </div>
  )
}
