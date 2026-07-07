import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import { db, seedDatabase } from '../src/lib/db'
import { parseCsvContent, executeImport } from '../src/lib/csv'
import type { CsvFormatSettings } from '../src/types'

describe('csv: parseCsvContent', () => {
  describe('formato con miles por coma y decimal por punto', () => {
    it('parsea CSV con "ARS 590,000.00" usando formato explícito', () => {
      // Valores con coma como miles deben ir entre comillas en CSV
      const csv = `Description,Amount
Alquiler,"ARS 590,000.00"
Internet,"ARS 8,500.00"`

      const format: CsvFormatSettings = {
        thousandsSeparator: ',',
        decimalSeparator: '.',
        stripCurrencyPrefix: true,
      }

      const { rows, errors } = parseCsvContent(csv, format)
      expect(rows).toHaveLength(2)
      expect(errors).toHaveLength(0)
      expect(rows[0].amount).toBe(590000)
      expect(rows[1].amount).toBe(8500)
    })
  })

  describe('formato argentino con miles por punto y decimal por coma', () => {
    it('parsea CSV con "590.000,00" usando formato explícito', () => {
      // Valores con coma como decimal deben ir entre comillas en CSV
      const csv = `Description,Amount
Alquiler,"590.000,00"
Internet,"8.500,00"`

      const format: CsvFormatSettings = {
        thousandsSeparator: '.',
        decimalSeparator: ',',
        stripCurrencyPrefix: true,
      }

      const { rows, errors } = parseCsvContent(csv, format)
      expect(rows).toHaveLength(2)
      expect(errors).toHaveLength(0)
      expect(rows[0].amount).toBe(590000)
      expect(rows[1].amount).toBe(8500)
    })
  })

  describe('mapeo de categorías', () => {
    it('mapea "Finanzas y Deudas" a other_exp', () => {
      const csv = `Description,Amount,Category
Pago tarjeta,15000,Finanzas y Deudas`

      const format: CsvFormatSettings = {
        thousandsSeparator: ',',
        decimalSeparator: '.',
        stripCurrencyPrefix: true,
      }

      const { rows } = parseCsvContent(csv, format)
      expect(rows).toHaveLength(1)
      expect(rows[0].categoryId).toBe('other_exp')
      expect(rows[0].categoryName).toBe('Finanzas y Deudas')
    })

    it('mapea "Hogar" a home', () => {
      const csv = `Description,Amount,Category
Muebles,25000,Hogar`

      const format: CsvFormatSettings = {
        thousandsSeparator: ',',
        decimalSeparator: '.',
        stripCurrencyPrefix: true,
      }

      const { rows } = parseCsvContent(csv, format)
      expect(rows).toHaveLength(1)
      expect(rows[0].categoryId).toBe('home')
      expect(rows[0].categoryName).toBe('Hogar')
    })

    it('mapea "Deporte" a leisure', () => {
      const csv = `Description,Amount,Category
Gimnasio,5000,Deporte`

      const format: CsvFormatSettings = {
        thousandsSeparator: ',',
        decimalSeparator: '.',
        stripCurrencyPrefix: true,
      }

      const { rows } = parseCsvContent(csv, format)
      expect(rows).toHaveLength(1)
      expect(rows[0].categoryId).toBe('leisure')
      expect(rows[0].categoryName).toBe('Deporte')
    })

    it('mapea "Servicios Públicos" a services', () => {
      const csv = `Description,Amount,Category
Luz,3200,Servicios Públicos`

      const format: CsvFormatSettings = {
        thousandsSeparator: ',',
        decimalSeparator: '.',
        stripCurrencyPrefix: true,
      }

      const { rows } = parseCsvContent(csv, format)
      expect(rows).toHaveLength(1)
      expect(rows[0].categoryId).toBe('services')
      expect(rows[0].categoryName).toBe('Servicios Públicos')
    })

    it('mapea "Alimentación" a food', () => {
      const csv = `Description,Amount,Category
Supermercado,12000,Alimentación`

      const format: CsvFormatSettings = {
        thousandsSeparator: ',',
        decimalSeparator: '.',
        stripCurrencyPrefix: true,
      }

      const { rows } = parseCsvContent(csv, format)
      expect(rows).toHaveLength(1)
      expect(rows[0].categoryId).toBe('food')
      expect(rows[0].categoryName).toBe('Alimentación')
    })
  })

   describe('detección de encabezado', () => {
    it('detecta encabezado y usa índices correctos', () => {
      const csv = `Description,Amount
Alquiler,45000
Internet,8500`

      const { rows } = parseCsvContent(csv)
      expect(rows).toHaveLength(2)
      expect(rows[0].description).toBe('alquiler')
      expect(rows[0].amount).toBe(45000)
      expect(rows[1].description).toBe('internet')
      expect(rows[1].amount).toBe(8500)
    })

    it('usa índices por defecto cuando no hay encabezado', () => {
      const csv = `Alquiler,45000`

      const { rows } = parseCsvContent(csv)
      expect(rows).toHaveLength(1)
      expect(rows[0].description).toBe('alquiler')
      expect(rows[0].amount).toBe(45000)
    })
  })

  describe('líneas con error', () => {
    it('marca líneas sin monto como error', () => {
      const csv = `Description,Amount
Alquiler,45000
Sin monto,`

      const { rows, errors } = parseCsvContent(csv)
      expect(rows).toHaveLength(1)
      expect(errors).toContain(3)
    })

    it('marca líneas vacías como error', () => {
      const csv = `Description,Amount
Alquiler,45000
,`

      const { rows, errors } = parseCsvContent(csv)
      expect(rows).toHaveLength(1)
      expect(errors).toContain(3)
    })
  })

  describe('formato de monto sin prefijo', () => {
    it('parsea montos simples sin prefijo de moneda', () => {
      const csv = `Description,Amount
Alquiler,45000
Internet,8500`

      const format: CsvFormatSettings = {
        thousandsSeparator: ',',
        decimalSeparator: '.',
        stripCurrencyPrefix: false,
      }

      const { rows, errors } = parseCsvContent(csv, format)
      expect(rows).toHaveLength(2)
      expect(errors).toHaveLength(0)
      expect(rows[0].amount).toBe(45000)
      expect(rows[1].amount).toBe(8500)
    })
  })
})

describe('csv: executeImport', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
    await seedDatabase()
  })

  it('importa filas parseadas a la base de datos', async () => {
    const csv = `Description,Amount
Alquiler,45000
Internet,8500`

    const { rows } = parseCsvContent(csv)
    const result = await executeImport(rows)

    expect(result.imported).toBe(2)
    expect(result.errors).toBe(0)

    const all = await db.transactions.toArray()
    expect(all).toHaveLength(2)
    expect(all[0].amount).toBe(45000)
    expect(all[1].amount).toBe(8500)
  })

  it('maneja errores al importar filas inválidas', async () => {
    const csv = `Description,Amount
,0
Internet,8500`

    const { rows } = parseCsvContent(csv)
    // rows will have 1 valid row (Internet) since ",0" is filtered by parseCsvContent
    const result = await executeImport(rows)

    expect(result.imported).toBe(1)
    expect(result.errors).toBe(0)
  })
})
