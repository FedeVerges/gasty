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
  /** Optional per-transaction emoji override. When set, displayed instead of the category emoji. */
  emoji?: string
  createdAt: string
}

export type CategoryType = 'expense' | 'income' | 'both'

export interface Category {
  id: string
  name: string
  emoji: string
  color: string
  type: CategoryType
  keywords: string[]
}

export type Theme = 'light' | 'dark'

export type Currency = 'ARS' | 'USD'

export type CsvThousandsSep = ',' | '.' | 'auto'
export type CsvDecimalSep = ',' | '.' | 'auto'

export interface CsvFormatSettings {
  /** How thousands are separated in the CSV amount column */
  thousandsSeparator: CsvThousandsSep
  /** How decimals are separated in the CSV amount column */
  decimalSeparator: CsvDecimalSep
  /** Whether to strip currency prefixes like "ARS", "USD", "$", "US$" */
  stripCurrencyPrefix: boolean
}

export interface Settings {
  theme: Theme
  currency: Currency
  csvFormat: CsvFormatSettings
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

export interface Investment {
  id: string
  name: string
  /** Allocation percentage of the total saved amount (0-100) */
  allocationPct: number
  /** Expected monthly return percentage (e.g. 1.5 = 1.5% per month) */
  monthlyReturnPct: number
  emoji: string
}
