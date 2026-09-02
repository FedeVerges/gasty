import { useState, useMemo, useRef } from 'react'
import { db } from '../../lib/db'
import { parseBatchInput, parseInput, createTransactionFromParsed } from '../../lib/parser'
import { saveTransactionsAtomically } from '../../lib/batch'
import { createFutureClones } from '../../lib/recurring'
import { useCategories } from '../../hooks/useCategories'
import { useSettings } from '../../context/SettingsContext'
import { formatMoney } from '../../lib/format'
import { FlashChips } from './FlashChips'
import type { ParsedTransaction, TransactionType } from '../../types'

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
  const inputRef = useRef<HTMLInputElement>(null)

  const batch = useMemo(() => (
    text.includes(', ') ? parseBatchInput(text) : null
  ), [text])

  const parsed: ParsedTransaction | null = useMemo(() => {
    if (batch) return null

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
  }, [text, typeOverride, categoryOverride, dateOverride, categories, batch])

  const category = parsed
    ? categories.find((c) => c.id === parsed.categoryId)
    : undefined

  const handleSubmit = async (e: React.PointerEvent | React.FormEvent) => {
    e.preventDefault()
    inputRef.current?.blur()

    if (batch) {
      if (batch.transactions.length === 0) return

      const transactions = batch.transactions.map(createTransactionFromParsed)
      await saveTransactionsAtomically(transactions)

      setText('')
      setTypeOverride(null)
      setCategoryOverride(null)
      setDateOverride(null)
      onTransactionCreated?.()
      return
    }

    if (!parsed) return

    const finalRecurring = parsed.recurring
    const tx = createTransactionFromParsed({
      ...parsed,
      recurring: finalRecurring,
    })

    if (finalRecurring.kind !== 'none') {
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

  const canSubmit = batch ? batch.transactions.length > 0 : Boolean(parsed)
  const submitLabel = batch
    ? `Guardar ${batch.transactions.length} ${batch.transactions.length === 1 ? 'movimiento' : 'movimientos'}`
    : 'Guardar transacción'

  return (
    <div className="sticky top-0 z-20 bg-canvas pt-1 pb-1 space-y-2">
      {/* ── Input card ── */}
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
                  bg-canvas border-2 border-border
                  focus:border-primary
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
            disabled={!canSubmit}
            className="
                  w-11 h-11 shrink-0 rounded-xl
                  bg-positive text-white border-2 border-positive-deep
                  flex items-center justify-center
                  disabled:opacity-30 disabled:cursor-not-allowed
                  active:scale-95
                  transition-transform duration-150
                "
            aria-label={submitLabel}
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

      {batch && (
        <div
          aria-label="Vista previa de carga múltiple"
          className="bg-card border border-border shadow-xl rounded-xl animate-fade-in motion-reduce:animate-none"
        >
          <div className="px-3 pt-3 pb-2">
            <p className="text-sm font-semibold text-ink">
              {batch.transactions.length} {batch.transactions.length === 1 ? 'movimiento listo' : 'movimientos listos'}
            </p>
            {batch.ignored.length > 0 && (
              <p className="mt-1 text-xs text-negative">
                {batch.ignored.length} {batch.ignored.length === 1 ? 'entrada ignorada' : 'entradas ignoradas'}
              </p>
            )}
          </div>
          <div className="divide-y divide-border">
            {batch.transactions.map((transaction, index) => {
              const batchCategory = categories.find((item) => item.id === transaction.categoryId)
              return (
                <div key={`${transaction.description}-${index}`} className="flex items-center gap-2 px-3 py-2.5">
                  <span className="text-xl" aria-hidden="true">{batchCategory?.emoji ?? '🏷️'}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">{transaction.description}</p>
                    <p className="text-xs text-mute">
                      <span>{transaction.type === 'income' ? 'Ingreso' : 'Gasto'}</span>
                      {' · '}{batchCategory?.name ?? 'Otros'} · {transaction.date}
                    </p>
                  </div>
                  <span className={`shrink-0 text-sm font-bold ${transaction.type === 'income' ? 'text-positive' : 'text-negative'}`}>
                    {transaction.type === 'income' ? '+' : '−'} {formatMoney(transaction.amount, settings.currency)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Preview card — compact, editable ── */}
      {parsed && category && (
        <div className="bg-card border border-border shadow-xl rounded-xl animate-fade-in motion-reduce:animate-none">
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
                  w-10 h-10 rounded-xl border border-border flex items-center justify-center text-lg font-bold transition-colors
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
                  w-10 h-10 rounded-xl border border-border flex items-center justify-center text-lg font-bold transition-colors
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
