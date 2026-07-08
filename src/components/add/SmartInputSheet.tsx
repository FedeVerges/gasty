import { useState, useEffect, useMemo, useRef } from 'react'
import { db } from '../../lib/db'
import { parseInput, createTransactionFromParsed, toLocalISO } from '../../lib/parser'
import { useCategories } from '../../hooks/useCategories'
import { useKeyboardHeight } from '../../hooks/useKeyboardHeight'
import { useViewport } from '../../hooks/useViewport'
import { useSettings } from '../../context/SettingsContext'
import { formatMoney, formatDateFull } from '../../lib/format'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { FlashChips } from './FlashChips'
import type { ParsedTransaction, RecurringConfig, Transaction, TransactionType } from '../../types'

interface SmartInputSheetProps {
  open: boolean
  onClose: () => void
  editTransaction?: Transaction | null
}

function generateEditText(tx: Transaction): string {
  const parts = [tx.description, String(tx.amount)]
  const datePart = tx.date.split('T')[0]
  const today = toLocalISO(new Date()).split('T')[0]
  if (datePart !== today) {
    const [, m, d] = datePart.split('-').map(Number)
    parts.push(`${d}-${m}`)
  }
  return parts.join(' ')
}

export function SmartInputSheet({ open, onClose, editTransaction }: SmartInputSheetProps) {
  const { settings } = useSettings()
  const { isDesktop } = useViewport()
  const categories = useCategories()
  const [text, setText] = useState(() =>
    editTransaction ? generateEditText(editTransaction) : ''
  )
  const [recurring, setRecurring] = useState<RecurringConfig>(
    () => editTransaction?.recurring ?? { kind: 'none' }
  )
  const [tempMonths, setTempMonths] = useState(() =>
    editTransaction?.recurring.kind === 'fixed_temporary'
      ? editTransaction.recurring.totalMonths ?? 12
      : 12
  )
  const [typeOverride, setTypeOverride] = useState<TransactionType | null>(
    () => editTransaction?.type ?? null
  )
  const [categoryOverride, setCategoryOverride] = useState<string | null>(
    () => editTransaction?.categoryId ?? null
  )
  const inputRef = useRef<HTMLInputElement>(null)
  const userTouchedRecurrence = useRef(false)
  const keyboardHeight = useKeyboardHeight()

  useEffect(() => {
    if (open) {
      const scrollY = window.scrollY
      document.body.style.position = 'fixed'
      document.body.style.top = `-${scrollY}px`
      document.body.style.width = '100%'
      return () => {
        document.body.style.position = ''
        document.body.style.top = ''
        document.body.style.width = ''
        window.scrollTo(0, scrollY)
      }
    }
  }, [open])

  const parsed: ParsedTransaction | null = useMemo(() => {
    const base = parseInput(text)
    if (!base) return null
    if (!typeOverride && !categoryOverride) return base
    let catId = base.categoryId
    let finalType = base.type
    if (typeOverride) {
      finalType = typeOverride
      const isIncome = typeOverride === 'income'
      catId = isIncome
        ? (categories.find(c => c.type === 'income')?.id ?? 'other_inc')
        : (categories.find(c => c.id === base.categoryId && c.type === 'expense')?.id ?? base.categoryId)
    }
    if (categoryOverride) {
      // Solo aplicar si la categoría manual es compatible con el tipo actual
      const cat = categories.find((c) => c.id === categoryOverride)
      const currentType = typeOverride ?? base.type
      if (cat && (currentType === 'income' ? cat.type === 'income' : cat.type === 'expense')) {
        catId = categoryOverride
      }
    }
    // Si el tipo cambió y la descripción es el fallback por defecto, actualizarla
    let description = base.description
    if (finalType !== base.type && (base.description === 'Gasto' || base.description === 'Ingreso')) {
      description = finalType === 'income' ? 'Ingreso' : 'Gasto'
    }
    return { ...base, type: finalType, categoryId: catId, description }
  }, [text, typeOverride, categoryOverride, categories])

  const category = parsed
    ? categories.find((c) => c.id === parsed.categoryId)
    : undefined

  const handleSubmit = async (e: React.PointerEvent | React.FormEvent) => {
    e.preventDefault()
    if (!parsed) return
    inputRef.current?.blur()
    const finalRecurring: RecurringConfig =
      userTouchedRecurrence.current
        ? recurring.kind === 'fixed_temporary'
          ? { ...recurring, totalMonths: tempMonths, currentMonth: 1 }
          : recurring
        : editTransaction?.recurring ?? (
          parsed.recurring.kind !== 'none'
            ? parsed.recurring
            : recurring
        )

    if (editTransaction) {
      const tx = createTransactionFromParsed({
        ...parsed,
        recurring: finalRecurring,
      })
      tx.id = editTransaction.id
      tx.createdAt = editTransaction.createdAt
      await db.transactions.put(tx)
    } else {
      const tx = createTransactionFromParsed({
        ...parsed,
        recurring: finalRecurring,
      })
      await db.transactions.add(tx)
    }
    onClose()
  }

  const handleBackdrop = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose()
  }

  if (!open) return null

  return (
    <div
      className={`fixed inset-0 z-50 flex justify-center animate-fade-in ${isDesktop ? 'items-center sheet-desktop' : 'items-end'}`}
      onClick={handleBackdrop}
      style={{ background: 'var(--color-overlay)' }}
    >
      <div
        className={`
          w-full max-w-[480px]
          bg-canvas
          overflow-y-auto
          ${isDesktop ? 'rounded-3xl' : 'rounded-t-3xl animate-slide-up'}
        `}
        style={{
          paddingBottom: 'env(safe-area-inset-bottom)',
          marginBottom: !isDesktop && keyboardHeight ? keyboardHeight : undefined,
          maxHeight: isDesktop
            ? '85vh'
            : keyboardHeight > 0
              ? `calc(100vh - ${keyboardHeight + 80}px)`
              : '90vh',
        }}
      >
        <div className="sticky top-0 bg-canvas px-5 pt-4 pb-2 z-10">
          <div className="w-10 h-1 bg-border rounded-full mx-auto mb-4" />
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold">{editTransaction ? 'Editar transacción' : 'Nueva transacción'}            </h2>
            <button
              onClick={onClose}
              className="text-body p-1 active:scale-95"
              aria-label="Cerrar"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        <form className="px-5 pb-6 space-y-4" >
          {/* Gasty Flash — contextual suggestions when input is empty */}
          {!text && !editTransaction && (
            <div className="mb-1">
              <FlashChips onSelect={(suggestionText) => setText(suggestionText)} />
            </div>
          )}

          <div>
            <input
              ref={inputRef}
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Ej: birra 1500"
              className="
                w-full text-xl p-4
                rounded-2xl
                bg-canvas border-2 border-border
                focus:border-primary
                placeholder:text-mute
                transition-colors
              "
              autoFocus
            />
            <div className="flex items-center gap-2 mt-2 px-1">
              <p className="text-xs text-body flex-1">
                Ej: birra 1500
              </p>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setTypeOverride(typeOverride === 'expense' ? null : 'expense')}
                  className={`
                    w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold
                    transition-colors
                    ${typeOverride === 'expense'
                      ? 'bg-negative text-white'
                      : 'bg-canvas-soft text-body border border-border'}
                  `}
                  aria-label="Marcar como gasto"
                >
                  −
                </button>
                <button
                  type="button"
                  onClick={() => setTypeOverride(typeOverride === 'income' ? null : 'income')}
                  className={`
                    w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold
                    transition-colors
                    ${typeOverride === 'income'
                      ? 'bg-positive text-white'
                      : 'bg-canvas-soft text-body border border-border'}
                  `}
                  aria-label="Marcar como ingreso"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {parsed && category && (
            <div
              className="rounded-2xl p-4 border"
              style={{
                background: `${category.color}10`,
                borderColor: `${category.color}30`,
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
                  style={{ background: `${category.color}25` }}
                >
                  {category.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-2xl font-bold"
                      style={{ color: parsed.type === 'income' ? 'var(--color-positive)' : 'var(--color-negative)' }}
                    >
                      {parsed.type === 'income' ? '+' : '−'} {formatMoney(parsed.amount, settings.currency)}
                    </span>
                  </div>
                  <p className="text-sm text-body truncate">
                    {parsed.description} · {category.name} · {formatDateFull(parsed.date)}
                  </p>
                </div>
              </div>

              {(parsed.recurring.kind === 'fixed' || parsed.recurring.kind === 'fixed_temporary') && recurring.kind === 'none' && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge color="recurring">
                    {parsed.recurring.kind === 'fixed_temporary'
                      ? `⏱️ ${parsed.recurring.currentMonth}/${parsed.recurring.totalMonths} cuotas`
                      : '🔄 Detectado: recurrente'}
                  </Badge>
                </div>
              )}
            </div>
          )}

          {parsed && (
            <div>
              <p className="text-xs text-body uppercase tracking-wide mb-2 font-medium">
                Categoría
              </p>
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                {categories
                  .filter((c) => parsed.type === 'income' ? c.type === 'income' : c.type === 'expense')
                  .map((c) => {
                    const selected = (categoryOverride ?? parsed.categoryId) === c.id
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setCategoryOverride(c.id)}
                        className={`
                          shrink-0 px-3.5 py-2 rounded-full text-sm font-medium
                          flex items-center gap-1.5 transition-all
                          ${selected
                            ? 'text-white'
                            : 'bg-canvas-soft border border-border text-body hover:bg-card-hover'
                          }
                        `}
                        style={selected ? { background: c.color } : undefined}
                      >
                        <span className="text-base">{c.emoji}</span>
                        <span>{c.name}</span>
                      </button>
                    )
                  })}
              </div>
            </div>
          )}

          {parsed && (
            <div>
              <p className="text-xs text-body uppercase tracking-wide mb-2 font-medium">
                ¿Es recurrente?
              </p>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => { userTouchedRecurrence.current = true; setRecurring({ kind: 'none' }) }}
                  className={`
                    py-3 px-2 rounded-2xl text-sm font-medium border-2 transition-colors
                    ${recurring.kind === 'none' ? 'border-primary bg-primary-pale text-on-primary' : 'border-border text-body'}
                  `}
                >
                  No
                </button>
                <button
                  type="button"
                  onClick={() => { userTouchedRecurrence.current = true; setRecurring({ kind: 'fixed' }) }}
                  className={`
                    py-3 px-2 rounded-2xl text-sm font-medium border-2 transition-colors
                    ${recurring.kind === 'fixed' ? 'border-recurring bg-recurring-soft text-recurring' : 'border-border text-body'}
                  `}
                >
                  🔄 Todos los meses
                </button>
                <button
                  type="button"
                  onClick={() => { userTouchedRecurrence.current = true; setRecurring({ kind: 'fixed_temporary' }) }}
                  className={`
                    py-3 px-2 rounded-2xl text-sm font-medium border-2 transition-colors
                    ${recurring.kind === 'fixed_temporary' ? 'border-recurring bg-recurring-soft text-recurring' : 'border-border text-body'}
                  `}
                >
                  ⏱️ Por un tiempo
                </button>
              </div>

              {recurring.kind === 'fixed_temporary' && (
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-sm text-body">Por</span>
                  <input
                    type="number"
                    min="1"
                    max="240"
                    value={tempMonths}
                    onChange={(e) => setTempMonths(Math.max(1, Math.min(240, parseInt(e.target.value) || 1)))}
                    className="w-20 px-3 py-2 rounded-xl bg-canvas border border-border text-center"
                  />
                  <span className="text-sm text-body">meses</span>
                </div>
              )}
            </div>
          )}

          <div className="pt-2">
            <Button
              type="submit"
              onClick={handleSubmit}
              disabled={!parsed}
              fullWidth
              size="lg"
            >
              Confirmar
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
