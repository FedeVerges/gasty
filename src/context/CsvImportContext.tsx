import { createContext } from 'react'

export const CsvImportContext = createContext<(() => void) | null>(null)
