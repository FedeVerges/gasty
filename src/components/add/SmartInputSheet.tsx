import { useState, useEffect, useMemo } from 'react'
import { db } from '../../lib/db'
import { parseInput, createTransactionFromParsed } from '../../lib/parser'
import { useCategories } from '../../hooks/useCategories'
import { useSettings } from '../../context/SettingsContext'
import { formatMoney, formatDateFull } from '../../lib/format'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import type { ParsedTransaction, RecurringConfig, Transaction } from '../../types'

interface SmartInputSheetProps {
  open: boolean
  onClose: () => void
  editTransaction?: Transaction | null
}

function generateEditText(tx: Transaction): string {
  const parts = [tx.description, String(tx.amount)]
  const today = new Date().toISOString().slice(0, 10)
  if (tx.date !== today) {
    const [, m, d] = tx.date.split('-').map(Number)
    parts.push(`${d}-${m}`)
  }
  return parts.join(' ')
}

export function SmartInputSheet({ open, onClose, editTransaction }: SmartInputSheetProps) {
  const { settings } = useSettings()
  const categories = useCategories()
  const [text, setText] = useState('')
  const [recurring, setRecurring] = useState<RecurringConfig>({ kind: 'none' })
  const [tempMonths, setTempMonths] = useState(12)

  useEffect(() => {
    if (open) {
      if (editTransaction) {
        setText(generateEditText(editTransaction))
        setRecurring(editTransaction.recurring)
      } else {
        setText('')
        setRecurring({ kind: 'none' })
      }
    }
  }, [open, editTransaction])

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = ''
      }
    }
  }, [open])

  const parsed: ParsedTransaction | null = useMemo(() => parseInput(text), [text])

  const category = parsed
    ? categories.find((c) => c.id === parsed.categoryId)
    : undefined

  const handleConfirm = async () => {
    if (!parsed) return
    const finalRecurring: RecurringConfig =
      recurring.kind !== 'none' && recurring.kind === 'fixed_temporary'
        ? { ...recurring, totalMonths: tempMonths, currentMonth: 1 }
        : recurring

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
      className="fixed inset-0 z-50 flex items-end justify-center animate-fade-in"
      onClick={handleBackdrop}
      style={{ background: 'var(--color-overlay)' }}
    >
      <div
        className="
          w-full max-w-[480px]
          bg-card rounded-t-3xl
          animate-slide-up
          max-h-[90vh] overflow-y-auto
        "
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="sticky top-0 bg-card px-5 pt-4 pb-2 z-10">
          <div className="w-10 h-1 bg-border rounded-full mx-auto mb-4" />
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold">{editTransaction ? 'Editar transacción' : 'Nueva transacción'}</h2>
            <button
              onClick={onClose}
              className="text-text-muted p-1 active:scale-95"
              aria-label="Cerrar"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        <div className="px-5 pb-6 space-y-4">
          <div>
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="birra 1500, alquiler 45000, sueldo 150000..."
              className="
                w-full text-xl p-4
                rounded-2xl
                bg-bg border-2 border-border
                focus:border-accent
                placeholder:text-text-subtle
                transition-colors
              "
              autoFocus
            />
            <p className="text-xs text-text-muted mt-2 px-1">
              Tip: "lomito 3000 20-5" — fecha con guión. "cuota auto 25000 4/24" — con cuotas.
            </p>
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
                      style={{ color: parsed.type === 'income' ? 'var(--color-income)' : 'var(--color-expense)' }}
                    >
                      {parsed.type === 'income' ? '+' : '−'} {formatMoney(parsed.amount, settings.currency)}
                    </span>
                  </div>
                  <p className="text-sm text-text-muted truncate">
                    {parsed.description} · {category.name} · {formatDateFull(parsed.date)}
                  </p>
                </div>
              </div>

              {parsed.recurring.kind === 'fixed' && recurring.kind === 'none' && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge color="recurring">🔄 Detectado: recurrente</Badge>
                </div>
              )}
            </div>
          )}

          {parsed && (
            <div>
              <p className="text-xs text-text-muted uppercase tracking-wide mb-2 font-medium">
                ¿Es recurrente?
              </p>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setRecurring({ kind: 'none' })}
                  className={`
                    py-3 px-2 rounded-2xl text-sm font-medium border-2 transition-colors
                    ${recurring.kind === 'none' ? 'border-accent bg-accent-soft text-accent' : 'border-border text-text-muted'}
                  `}
                >
                  No
                </button>
                <button
                  onClick={() => setRecurring({ kind: 'fixed' })}
                  className={`
                    py-3 px-2 rounded-2xl text-sm font-medium border-2 transition-colors
                    ${recurring.kind === 'fixed' ? 'border-recurring bg-recurring-soft text-recurring' : 'border-border text-text-muted'}
                  `}
                >
                  🔄 Todos los meses
                </button>
                <button
                  onClick={() => setRecurring({ kind: 'fixed_temporary' })}
                  className={`
                    py-3 px-2 rounded-2xl text-sm font-medium border-2 transition-colors
                    ${recurring.kind === 'fixed_temporary' ? 'border-recurring bg-recurring-soft text-recurring' : 'border-border text-text-muted'}
                  `}
                >
                  ⏱️ Por un tiempo
                </button>
              </div>

              {recurring.kind === 'fixed_temporary' && (
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-sm text-text-muted">Por</span>
                  <input
                    type="number"
                    min="1"
                    max="240"
                    value={tempMonths}
                    onChange={(e) => setTempMonths(Math.max(1, Math.min(240, parseInt(e.target.value) || 1)))}
                    className="w-20 px-3 py-2 rounded-xl bg-bg border border-border text-center"
                  />
                  <span className="text-sm text-text-muted">meses</span>
                </div>
              )}
            </div>
          )}

          <div className="pt-2">
            <Button
              onClick={handleConfirm}
              disabled={!parsed}
              fullWidth
              size="lg"
            >
              Confirmar
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
