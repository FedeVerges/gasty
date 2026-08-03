import { useState, useMemo, useRef } from 'react'
import { db } from '../../lib/db'
import { parseInput, createTransactionFromParsed } from '../../lib/parser'
import { createFutureClones } from '../../lib/recurring'
import { useCategories } from '../../hooks/useCategories'
import { useSettings } from '../../context/SettingsContext'
import { formatMoney } from '../../lib/format'
import { FlashChips } from './FlashChips'
import type { ParsedTransaction, RecurringConfig, TransactionType } from '../../types'

interface InlineSmartInputProps {
  /** Called after a transaction is successfully created */
  onTransactionCreated?: () => void
}

export function InlineSmartInput({ onTransactionCreated }: InlineSmartInputProps) {
  const { settings } = useSettings()
  const categories = useCategories()
  const [text, setText] = useState('')
  const [typeOverride, setTypeOverride] = useState<TransactionType | null>(null)
  const [categoryOverride, setCategoryOverride] = useState<string | null>(null)
  const [dateOverride, setDateOverride] = useState<string | null>(null)
  const [recurring] = useState<RecurringConfig>({ kind: 'none' })
  const inputRef = useRef<HTMLInputElement>(null)

  const parsed: ParsedTransaction | null = useMemo(() => {
    const base = parseInput(text)
    if (!base) return null

    const effectiveType = typeOverride ?? base.type
    const isIncome = effectiveType === 'income'

    // Determine category: override > parser's pick > fallback
    let catId = base.categoryId
    if (categoryOverride) {
      catId = categoryOverride
    } else if (typeOverride) {
      catId = isIncome
        ? (categories.find(c => c.type === 'income')?.id ?? 'other_inc')
        : (categories.find(c => c.id === base.categoryId && c.type === 'expense')?.id ?? base.categoryId)
    }

    let description = base.description
    if (typeOverride !== base.type && (base.description === 'Gasto' || base.description === 'Ingreso')) {
      description = typeOverride === 'income' ? 'Ingreso' : 'Gasto'
    }

    const date = dateOverride ?? base.date

    return { ...base, type: effectiveType, categoryId: catId, description, date }
  }, [text, typeOverride, categoryOverride, dateOverride, categories])

  const category = parsed
    ? categories.find((c) => c.id === parsed.categoryId)
    : undefined

  const handleSubmit = async (e: React.PointerEvent | React.FormEvent) => {
    e.preventDefault()
    if (!parsed) return

    inputRef.current?.blur()

    const tx = createTransactionFromParsed({
      ...parsed,
      recurring,
    })

    if (recurring.kind !== 'none') {
      await db.transaction('rw', db.transactions, async () => {
        await db.transactions.add(tx)
        await createFutureClones(tx)
      })
    } else {
      await db.transactions.add(tx)
    }

    setText('')
    setTypeOverride(null)
    setCategoryOverride(null)
    setDateOverride(null)
    onTransactionCreated?.()
  }

  return (
    <div className="sticky top-0 z-20 bg-canvas pt-1 pb-1 space-y-2">
      {/* ── Input card ── */}
      <div className="bg-card border-maguito shadow-maguito rounded-maguito-md p-3">
          <form onSubmit={handleSubmit}>
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={text}
                onChange={(e) => { setText(e.target.value); setCategoryOverride(null); setDateOverride(null) }}
                placeholder="Ej: birra 1500"
                className="
                  flex-1 px-4 py-3 text-base
                  rounded-xl
                  bg-canvas border-maguito
                  focus:ring-2 focus:ring-primary
                  placeholder:text-mute
                  transition-colors
                "
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
              />
              {text && (
                <button
                  type="button"
                  onClick={() => { setText(''); setCategoryOverride(null); setDateOverride(null); inputRef.current?.focus() }}
                  className="
                    w-8 h-8 shrink-0 rounded-full
                    flex items-center justify-center
                    text-mute hover:text-ink hover:bg-canvas-soft
                    active:scale-90 transition-[transform,color,background-color] duration-150
                  "
                  aria-label="Limpiar texto"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}
                       strokeLinecap="round" className="w-4 h-4">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
              <button
                type="submit"
                disabled={!parsed}
                className="
                  w-11 h-11 shrink-0 rounded-xl
                  bg-positive text-white border-2 border-positive-deep
                  shadow-maguito
                  flex items-center justify-center
                  disabled:opacity-30 disabled:cursor-not-allowed
                  active:translate-y-[2px] active:shadow-none
                  transition-[transform,box-shadow] duration-150
                "
                aria-label="Agregar transacción"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}
                     strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
            </div>
          </form>

          {/* Flash chips — show when input is empty */}
          {!text && (
            <div className="mt-2">
              <FlashChips onSelect={(suggestionText) => setText(suggestionText)} />
            </div>
          )}
        </div>

      {/* ── Preview card — compact, editable ── */}
      {parsed && category && (
        <div className="bg-card border-maguito shadow-maguito rounded-maguito-md animate-fade-in motion-reduce:animate-none">
          {/* Main row — like TransactionItem but editable */}
          <div className="flex items-center gap-3 py-3 px-3">
            {/* Emoji */}
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl shrink-0"
              style={{ background: `${category.color}20` }}
            >
              {category.emoji}
            </div>

            {/* Description + category select */}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-ink text-sm truncate">{parsed.description}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <select
                  value={parsed.categoryId}
                  onChange={(e) => setCategoryOverride(e.target.value)}
                  className="
                    px-2 py-0.5 rounded-full text-xs font-medium
                    bg-transparent border-0
                    focus:ring-1 focus:ring-primary
                    appearance-none cursor-pointer
                    truncate max-w-[140px]
                    transition-colors
                  "
                  style={{
                    color: category.color,
                    background: `${category.color}20`,
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8' viewBox='0 0 24 24' fill='none' stroke='%238a8a8a' stroke-width='3' stroke-linecap='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 4px center',
                    paddingRight: '16px',
                  }}
                  aria-label="Categoría"
                >
                  {categories
                    .filter(c => {
                      if (parsed.type === 'income') return c.type === 'income' || c.type === 'both'
                      return c.type === 'expense' || c.type === 'both'
                    })
                    .map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.emoji} {cat.name}
                      </option>
                    ))
                  }
                </select>
              </div>
            </div>

            {/* Amount + date */}
            <div className="flex flex-col items-end gap-1 shrink-0">
              <span
                className={`font-bold text-base ${parsed.type === 'income' ? 'text-positive' : 'text-negative'}`}
              >
                {parsed.type === 'income' ? '+' : '−'} {formatMoney(parsed.amount, settings.currency)}
              </span>
              <input
                type="date"
                value={parsed.date}
                onChange={(e) => setDateOverride(e.target.value)}
                className="
                  text-xs text-mute bg-transparent border-0
                  focus:ring-1 focus:ring-primary rounded
                  p-0 cursor-pointer
                "
                aria-label="Fecha"
              />
            </div>

            <div className="flex flex-col gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  const next = typeOverride === 'income' ? null : 'income'
                  setTypeOverride(next)
                  setCategoryOverride(null)
                }}
                className={`
                  w-10 h-10 rounded-xl border-maguito flex items-center justify-center text-lg font-bold transition-colors
                  ${typeOverride === 'income'
                    ? 'bg-positive text-white'
                    : 'bg-canvas-soft text-body'}
                `}
                aria-label="Marcar como ingreso"
              >
                +
              </button>
              <button
                type="button"
                onClick={() => {
                  const next = typeOverride === 'expense' ? null : 'expense'
                  setTypeOverride(next)
                  setCategoryOverride(null)
                }}
                className={`
                  w-10 h-10 rounded-xl border-maguito flex items-center justify-center text-lg font-bold transition-colors
                  ${typeOverride === 'expense'
                    ? 'bg-negative text-white'
                    : 'bg-canvas-soft text-body'}
                `}
                aria-label="Marcar como gasto"
              >
                −
              </button>
            </div>
          </div>
          </div>
      )}
    </div>
  )
}
