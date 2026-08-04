import { useState } from 'react'
import { useSettings } from '../../context/SettingsContext'
import { useCategories, useCategory } from '../../hooks/useCategories'
import { formatMoney, formatDate } from '../../lib/format'
import { db } from '../../lib/db'
import type { Transaction } from '../../types'

interface TransactionItemProps {
  transaction: Transaction
  /** Whether this item is in expanded edit mode */
  isExpanded?: boolean
  /** Callback to toggle expand/collapse */
  onToggle?: () => void
}

export function TransactionItem({ transaction, isExpanded = false, onToggle }: TransactionItemProps) {
  const { settings } = useSettings()
  const category = useCategory(transaction.categoryId)
  const categories = useCategories()

  const isIncome = transaction.type === 'income'
  const color = category?.color ?? 'var(--color-mute)'
  const displayEmoji = category?.emoji ?? '💸'

  // Edit state — initialized from transaction, reset on cancel/confirm
  const [editDescription, setEditDescription] = useState(transaction.description)
  const [editAmount, setEditAmount] = useState(String(transaction.amount))
  const [editDate, setEditDate] = useState(transaction.date.split('T')[0])
  const [editCategoryId, setEditCategoryId] = useState(transaction.categoryId)

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm('¿Eliminar esta transacción?')) {
      await db.transactions.delete(transaction.id)
    }
  }

  const handleConfirm = async (e: React.MouseEvent) => {
    e.stopPropagation()
    const amount = parseFloat(editAmount.replace(',', '.'))
    if (isNaN(amount) || amount <= 0) return

    await db.transactions.update(transaction.id, {
      description: editDescription.trim() || transaction.description,
      amount,
      date: editDate,
      categoryId: editCategoryId,
    })
    onToggle?.()
  }

  const handleCancel = (e: React.MouseEvent) => {
    e.stopPropagation()
    setEditDescription(transaction.description)
    setEditAmount(String(transaction.amount))
    setEditDate(transaction.date.split('T')[0])
    setEditCategoryId(transaction.categoryId)
    onToggle?.()
  }

  const handleRowClick = () => {
    if (!isExpanded) {
      onToggle?.()
    }
  }

  // Filter categories by transaction type
  const filteredCategories = categories.filter(c => {
    if (transaction.type === 'income') return c.type === 'income' || c.type === 'both'
    return c.type === 'expense' || c.type === 'both'
  })

  // Calculate expanded height based on content
  const expandedHeight = 280 // Approximate height for edit mode

  return (
    <div
      className={`
        border border-border rounded-xl overflow-hidden
        transition-all duration-200 ease-in-out
        ${isExpanded ? 'bg-canvas-soft' : 'active:bg-card-hover cursor-pointer'}
      `}
      style={{
        maxHeight: isExpanded ? `${expandedHeight}px` : '80px',
      }}
      onClick={handleRowClick}
    >
      {/* Collapsed row — always visible */}
      <div className="flex items-center gap-3 py-3 px-3">
        <div
          className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl shrink-0"
          style={{ background: `${color}20` }}
        >
          {displayEmoji}
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-medium text-ink truncate">
            {isExpanded ? (
              <input
                type="text"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="w-full bg-transparent border-b border-border focus:border-primary outline-none"
                autoFocus
              />
            ) : (
              transaction.description
            )}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            {/* Category badge with color */}
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
              style={{ background: `${color}25`, color }}
            >
              {displayEmoji} {category?.name}
            </span>
            {transaction.recurring.kind === 'fixed' && !transaction.originalId && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-recurring/20 text-recurring">
                🔄
              </span>
            )}
            {transaction.recurring.kind === 'fixed_temporary' && !transaction.originalId && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-recurring/20 text-recurring">
                {transaction.recurring.currentMonth}/{transaction.recurring.totalMonths}
              </span>
            )}
          </div>
        </div>

        {/* Amount + date column */}
        <div className="flex flex-col items-end gap-0.5 shrink-0">
          {isExpanded ? (
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={editAmount}
              onChange={(e) => setEditAmount(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              className="w-24 bg-transparent border-b border-border focus:border-primary outline-none text-right font-bold text-lg"
            />
          ) : (
            <span
              className={`font-bold text-lg ${isIncome ? 'text-positive' : 'text-negative'}`}
            >
              {isIncome ? '+' : '−'} {formatMoney(transaction.amount, settings.currency)}
            </span>
          )}
          {isExpanded ? (
            <input
              type="date"
              value={editDate}
              onChange={(e) => setEditDate(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              className="bg-transparent border-b border-border focus:border-primary outline-none text-xs"
            />
          ) : (
            <span className="text-xs text-mute">
              {formatDate(transaction.date)}
            </span>
          )}
        </div>

        {/* Action button — delete or confirm */}
        {isExpanded ? (
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={handleCancel}
              className="
                w-10 h-10 shrink-0
                flex items-center justify-center
                rounded-xl
                bg-canvas-soft text-body
                active:scale-95 transition-transform
              "
              aria-label="Cancelar edición"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            <button
              onClick={handleConfirm}
              className="
                w-10 h-10 shrink-0
                flex items-center justify-center
                rounded-xl
                bg-positive text-white
                active:scale-95 transition-transform
              "
              aria-label="Confirmar edición"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </button>
          </div>
        ) : (
          <button
            onClick={handleDelete}
            className="
              w-12 h-12 shrink-0
              flex items-center justify-center
              rounded-xl
              bg-negative/10 text-negative
              hover:bg-negative/20
              active:scale-95 transition-transform
            "
            aria-label="Eliminar transacción"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18" />
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              <line x1="10" y1="11" x2="10" y2="17" />
              <line x1="14" y1="11" x2="14" y2="17" />
            </svg>
          </button>
        )}
      </div>

      {/* Expanded content — category selector */}
      {isExpanded && (
        <div className="px-3 pb-3 border-t border-border-soft">
          <p className="text-xs text-mute mt-2 mb-1.5">Categoría</p>
          <div className="max-h-32 overflow-y-auto space-y-1">
            {filteredCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={(e) => {
                  e.stopPropagation()
                  setEditCategoryId(cat.id)
                }}
                className={`
                  w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-colors
                  ${editCategoryId === cat.id
                    ? 'bg-primary/20 text-ink font-medium'
                    : 'hover:bg-canvas-soft text-body'
                  }
                `}
              >
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0"
                  style={{ background: `${cat.color}30` }}
                >
                  {cat.emoji}
                </span>
                <span className="truncate">{cat.name}</span>
                {editCategoryId === cat.id && (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4 ml-auto text-primary shrink-0">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
