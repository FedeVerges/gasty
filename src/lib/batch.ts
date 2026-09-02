import { db } from './db'
import type { Transaction } from '../types'

export async function saveTransactionsAtomically(transactions: Transaction[]): Promise<void> {
  await db.transaction('rw', db.transactions, async () => {
    await db.transactions.bulkAdd(transactions)
  })
}
