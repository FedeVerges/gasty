import { useEffect } from 'react'
import { checkAndCloneRecurring } from '../lib/recurring'

export function useRecurringCheck() {
  useEffect(() => {
    checkAndCloneRecurring().catch(console.error)
  }, [])
}
