export type TransactionType = 'expense' | 'income'

export type RecurringKind = 'fixed' | 'fixed_temporary' | 'none'

export interface RecurringConfig {
  kind: RecurringKind
  totalMonths?: number
  currentMonth?: number
  invoiceDay?: number
}

export interface Transaction {
  id: string
  type: TransactionType
  amount: number
  description: string
  categoryId: string
  date: string
  recurring: RecurringConfig
  originalId?: string
  createdAt: string
}

export type CategoryType = 'expense' | 'income' | 'both'

export interface Category {
  id: string
  name: string
  emoji: string
  color: string
  type: CategoryType
}

export type Theme = 'light' | 'dark'

export type Currency = 'ARS' | 'USD'

export interface Settings {
  theme: Theme
  currency: Currency
}

export interface ParsedTransaction {
  type: TransactionType
  amount: number
  description: string
  categoryId: string
  date: string
  recurring: RecurringConfig
}

export type Tab = 'dashboard' | 'transactions' | 'stats' | 'settings'
