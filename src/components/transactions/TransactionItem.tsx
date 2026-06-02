import { useContext } from 'react'
import { Badge } from '../ui/Badge'
import { useSettings } from '../../context/SettingsContext'
import { useCategory } from '../../hooks/useCategories'
import { formatMoney, formatDate } from '../../lib/format'
import { db } from '../../lib/db'
import { EditTransactionContext } from '../layout/AppShell'
import type { Transaction } from '../../types'

interface TransactionItemProps {
  transaction: Transaction
}

export function TransactionItem({ transaction }: TransactionItemProps) {
  const { settings } = useSettings()
  const category = useCategory(transaction.categoryId)
  const onEdit = useContext(EditTransactionContext)

  const isIncome = transaction.type === 'income'
  const color = category?.color ?? 'var(--color-text-muted)'

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm('¿Eliminar esta transacción?')) {
      await db.transactions.delete(transaction.id)
    }
  }

  return (
    <div
      className="
        flex items-center gap-3 p-3
        rounded-2xl
        active:bg-card-hover transition-colors
      "
    >
      <div
        className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl shrink-0"
        style={{ background: `${color}20` }}
      >
        {category?.emoji ?? '💸'}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-text truncate">
            {transaction.description}
          </p>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-xs text-text-muted truncate">
            {category?.name}
          </span>
          <span className="text-xs text-text-subtle">·</span>
          <span className="text-xs text-text-muted">
            {formatDate(transaction.date)}
          </span>
          {transaction.recurring.kind === 'fixed' && (
            <Badge color="recurring">🔄</Badge>
          )}
          {transaction.recurring.kind === 'fixed_temporary' && (
            <Badge color="recurring">
              {transaction.recurring.currentMonth}/{transaction.recurring.totalMonths}
            </Badge>
          )}
        </div>
      </div>

        <div className="flex flex-col items-end gap-2">
          <span
            className={`font-bold text-lg ${isIncome ? 'text-income' : 'text-expense'}`}
          >
            {isIncome ? '+' : '−'} {formatMoney(transaction.amount, settings.currency)}
          </span>
          <div className="flex gap-3 w-full">
            <button
              onClick={() => onEdit?.(transaction)}
              className="flex-1 items-center justify-center px-4 py-2 text-accent font-medium rounded-lg border border-accent hover:bg-accent/10"
              aria-label="Editar"
            >
              Editar
            </button>
            <button
              onClick={handleDelete}
              className="flex-1 items-center justify-center px-4 py-2 text-text-subtle font-medium rounded-lg border border-border hover:bg-card-hover"
              aria-label="Eliminar"
            >
              Eliminar
            </button>
          </div>
        </div>
    </div>
  )
}
