import { useContext } from 'react'
import { Badge } from '../ui/Badge'
import { useSettings } from '../../context/SettingsContext'
import { useCategory } from '../../hooks/useCategories'
import { formatMoney, formatDate } from '../../lib/format'
import { db } from '../../lib/db'
import { EditTransactionContext } from '../../context/EditTransactionContext'
import type { Transaction } from '../../types'

interface TransactionItemProps {
  transaction: Transaction
}

export function TransactionItem({ transaction }: TransactionItemProps) {
  const { settings } = useSettings()
  const category = useCategory(transaction.categoryId)
  const onEdit = useContext(EditTransactionContext)

  const isIncome = transaction.type === 'income'
  const color = category?.color ?? 'var(--color-mute)'

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm('¿Eliminar esta transacción?')) {
      await db.transactions.delete(transaction.id)
    }
  }

  return (
    <div
      onClick={() => onEdit?.(transaction)}
      className="
        flex items-center gap-3 py-3
        active:bg-card-hover transition-colors cursor-pointer
      "
    >
      <div
        className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl shrink-0"
        style={{ background: `${color}20` }}
      >
        {category?.emoji ?? '💸'}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-medium text-ink truncate">
          {transaction.description}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-xs text-body truncate">
            {category?.name}
          </span>
          {transaction.recurring.kind === 'fixed' && !transaction.originalId && (
            <Badge color="recurring">🔄</Badge>
          )}
          {transaction.recurring.kind === 'fixed_temporary' && !transaction.originalId && (
            <Badge color="recurring">
              {transaction.recurring.currentMonth}/{transaction.recurring.totalMonths}
            </Badge>
          )}
        </div>
      </div>

      {/* Amount + date column */}
      <div className="flex flex-col items-end gap-0.5 shrink-0">
        <span
          className={`font-bold text-lg ${isIncome ? 'text-positive' : 'text-negative'}`}
        >
          {isIncome ? '+' : '−'} {formatMoney(transaction.amount, settings.currency)}
        </span>
        <span className="text-xs text-mute">
          {formatDate(transaction.date)}
        </span>
      </div>

      {/* Delete button — large & visible */}
      <button
        onClick={handleDelete}
        className="
          w-12 h-12 shrink-0
          flex items-center justify-center
          rounded-xl
          bg-negative/10 text-negative
          hover:bg-negative/20
          active:scale-95 transition-all
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
    </div>
  )
}
