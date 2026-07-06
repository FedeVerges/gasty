import { createContext } from 'react'
import type { Transaction } from '../types'

export const EditTransactionContext = createContext<((tx: Transaction) => void) | null>(null)
