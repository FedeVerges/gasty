import { useMemo } from 'react'
import { useAllTransactions } from '../../hooks/useTransactions'
import { useCategories } from '../../hooks/useCategories'

interface FlashChipsProps {
  onSelect: (text: string) => void
  /** Max number of chips to show (defaults to 6) */
  maxChips?: number
}

export function FlashChips({ onSelect, maxChips = 6 }: FlashChipsProps) {
  const transactions = useAllTransactions()
  const categories = useCategories()

  const chips = useMemo(() => {
    const latestByDescription = new Map<string, typeof transactions[number]>()
    for (const tx of [...transactions].sort((a, b) => b.createdAt.localeCompare(a.createdAt))) {
      const key = tx.description.trim().toLocaleLowerCase('es-AR')
      if (key && !latestByDescription.has(key)) latestByDescription.set(key, tx)
    }
    return [...latestByDescription.values()].slice(0, maxChips).map((tx) => ({
      text: `${tx.description} ${tx.amount}`,
      label: `${tx.description} $${new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(tx.amount)}`,
      emoji: categories.find((category) => category.id === tx.categoryId)?.emoji ?? '💸',
    }))
  }, [transactions, categories, maxChips])

  if (chips.length === 0) return null

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
             bg-card border border-border text-body
            hover:bg-card-hover active:scale-95
            transition-transform touch-manipulation
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
