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
      expect(rows[0].description).toBe('Alquiler')
      expect(rows[0].amount).toBe(45000)
      expect(rows[1].description).toBe('Internet')
      expect(rows[1].amount).toBe(8500)
    })

    it('usa índices por defecto cuando no hay encabezado', () => {
      const csv = `Alquiler,45000`

      const { rows } = parseCsvContent(csv)
      expect(rows).toHaveLength(1)
      expect(rows[0].description).toBe('Alquiler')
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

  describe('BOM (byte order mark)', () => {
    it('ignora BOM UTF-8 al inicio del archivo', () => {
      // BOM = \ufeff
      const csv = '\ufeffDescription,Amount\nAlquiler,45000\nInternet,8500'

      const { rows, errors } = parseCsvContent(csv)
      expect(errors).toHaveLength(0)
      expect(rows).toHaveLength(2)
      expect(rows[0].description).toBe('Alquiler')
      expect(rows[0].amount).toBe(45000)
    })
  })

  describe('fuzzy matching de categorías', () => {
    it('matchea "alimentacion" (sin acento) contra "Alimentación"', () => {
      const csv = 'Description,Amount,Category\nSuper,12000,alimentacion'

      const { rows } = parseCsvContent(csv)
      expect(rows).toHaveLength(1)
      expect(rows[0].categoryId).toBe('food')
    })

    it('matchea "transport" en inglés contra "Transporte"', () => {
      const csv = 'Description,Amount,Category\nUber,5000,transport'

      const { rows } = parseCsvContent(csv)
      expect(rows).toHaveLength(1)
      expect(rows[0].categoryId).toBe('transport')
    })

    it('matchea "AHORROS" (uppercase) contra alias "ahorros"', () => {
      const csv = 'Description,Amount,Category\nAhorro,10000,AHORROS'

      const { rows } = parseCsvContent(csv)
      expect(rows).toHaveLength(1)
      expect(rows[0].categoryId).toBe('other_exp')
    })

    it('mapea categoría del CSV real "Entretenimiento y Salidas a Comer"', () => {
      const csv = 'nombre,importe,fecha,categoria\nEntrada,30000,01/07/2026,Entretenimiento y Salidas a Comer'

      const format: CsvFormatSettings = {
        thousandsSeparator: ',',
        decimalSeparator: '.',
        stripCurrencyPrefix: true,
      }
      const { rows } = parseCsvContent(csv, format)
      expect(rows).toHaveLength(1)
      expect(rows[0].categoryId).toBe('leisure')
      expect(rows[0].categoryName).toBe('Entretenimiento y Salidas a Comer')
    })

    it('mapea categoría "Suscripciones" a services', () => {
      const csv = 'nombre,importe,fecha,categoria\nYouTube,1500,01/07/2026,Suscripciones'

      const { rows } = parseCsvContent(csv)
      expect(rows).toHaveLength(1)
      expect(rows[0].categoryId).toBe('services')
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
    const amounts = all.map((t) => t.amount).sort((a, b) => a - b)
    expect(amounts).toEqual([8500, 45000])
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

describe('csv: parseCSVLine — comas en montos sin comillas', () => {
  it('no parte el monto "ARS 590,000.00" por las comas internas', () => {
    const csv = `nombre,importe,fecha,categoria
Pago Tarjeta Galicia ,ARS 590,000.00,01/07/2026,Finanzas y Deudas ,
Alquiler + expensas Julio ,ARS 400,000.00,01/07/2026,Hogar,
Terapia (2),ARS 160,000.00,01/07/2026,Salud,
Youtube FP ,ARS 1,500.00,01/07/2026,Suscripciones,`

    const format: CsvFormatSettings = {
      thousandsSeparator: ',',
      decimalSeparator: '.',
      stripCurrencyPrefix: true,
    }

    const { rows, errors } = parseCsvContent(csv, format)
    expect(errors).toHaveLength(0)
    expect(rows).toHaveLength(4)
    expect(rows[0].description).toBe('Pago Tarjeta Galicia')
    expect(rows[0].amount).toBe(590000)
    expect(rows[0].categoryId).toBe('other_exp')
    expect(rows[1].amount).toBe(400000)
    expect(rows[1].categoryId).toBe('home')
    expect(rows[2].amount).toBe(160000)
    expect(rows[2].categoryId).toBe('health')
    expect(rows[3].amount).toBe(1500)
    expect(rows[3].categoryId).toBe('services')
  })

  it('auto-detecta formato de miles/decimal sin configuración explícita', () => {
    const csv = `nombre,importe,fecha,categoria
Pago Tarjeta Galicia ,ARS 590,000.00,01/07/2026,Finanzas y Deudas ,
Alquiler + expensas Julio ,ARS 400,000.00,01/07/2026,Hogar,`

    const { rows, errors } = parseCsvContent(csv)
    expect(errors).toHaveLength(0)
    expect(rows).toHaveLength(2)
    expect(rows[0].amount).toBe(590000)
    expect(rows[1].amount).toBe(400000)
  })
})

describe('csv: parseCsvContent con el archivo real del usuario', () => {
  it('procesa el CSV completo con montos quoteados "ARS xxx.xxx,xx"', () => {
    // Mismas filas que el archivo Egresos 2d5cbcfc292881bebe81f648f8ab74bf.csv
    const csv = `nombre,importe,fecha,categoria
Pago Tarjeta Galicia ,"ARS 590,000.00",01/07/2026,Finanzas y Deudas ,
Alquiler + expesas Julio ,"ARS 400,000.00",01/07/2026,Hogar,
Ahorro (2),"ARS 300,000.00",01/07/2026,Ahorros,
Terapia (2),"ARS 160,000.00",01/07/2026,Salud,
Tarjeta Naranja ,"ARS 120,000.00",01/07/2026,Finanzas y Deudas ,
Tenis ,"ARS 92,000.00",01/07/2026,Deporte,
Club Junio ,"ARS 80,000.00",01/07/2026,Deporte,
Tarjeta BNA ,"ARS 77,000.00",01/07/2026,Hogar,
Luz ,"ARS 60,000.00",01/07/2026,Servicios Públicos,
Ubers (2),"ARS 50,000.00",01/07/2026,Transporte,
Carne ,"ARS 45,000.00",01/07/2026,Alimentación,
Personal Flow INTERNET (4),"ARS 35,000.00",01/07/2026,Servicios Públicos ,
Entrada Gorillaz ,"ARS 30,000.00",01/07/2026,Entretenimiento y Salidas a Comer,
Gas ,"ARS 23,000.00",01/07/2026,Servicios Públicos ,
Tuenti Junio ,"ARS 17,000.00",01/07/2026,Servicios Públicos ,
Youtube FP ,"ARS 1,500.00",01/07/2026,Suscripciones,`

    const format: CsvFormatSettings = {
      thousandsSeparator: ',',
      decimalSeparator: '.',
      stripCurrencyPrefix: true,
    }

    const { rows, errors } = parseCsvContent(csv, format)
    expect(errors).toHaveLength(0)
    expect(rows).toHaveLength(16)

    // Verificar fechas
    expect(rows[0].date).toBe('2026-07-01T00:00')
    expect(rows[0].description).toBe('Pago Tarjeta Galicia')
    expect(rows[0].amount).toBe(590000)
    expect(rows[0].categoryId).toBe('other_exp')

    // Verificar algunas categorías clave
    expect(rows[1].categoryId).toBe('home')       // Hogar
    expect(rows[2].categoryId).toBe('other_exp')   // Ahorros → alias
    expect(rows[3].categoryId).toBe('health')      // Salud
    expect(rows[5].categoryId).toBe('leisure')     // Deporte → alias
    expect(rows[8].categoryId).toBe('services')    // Servicios Públicos
    expect(rows[12].categoryId).toBe('leisure')    // Entretenimiento y Salidas a Comer

    // Verificar montos específicos
    expect(rows[1].amount).toBe(400000)
    expect(rows[2].amount).toBe(300000)
    expect(rows[7].amount).toBe(77000)
    expect(rows[15].amount).toBe(1500)
  })
})

describe('csv: parseCsvContent con categorías de usuario en DB', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
    await seedDatabase()

    // Agregar una categoría personalizada que no está en DEFAULT_CATEGORIES
    await db.categories.add({
      id: 'mascotas',
      name: 'Mascotas',
      emoji: '🐱',
      color: '#f59e0b',
      type: 'expense',
      keywords: ['mascotas', 'veterinaria', 'pet'],
    })
  })

  it('matchea categoría de usuario por nombre exacto', async () => {
    const cats = await db.categories.toArray()
    const csv = 'Description,Amount,Category\nVeterinaria,5000,Mascotas'

    const { rows } = parseCsvContent(csv, undefined, cats)
    expect(rows).toHaveLength(1)
    expect(rows[0].categoryId).toBe('mascotas')
    expect(rows[0].categoryName).toBe('Mascotas')
  })

  it('matchea categoría de usuario con acento distinto', async () => {
    const cats = await db.categories.toArray()
    const csv = 'Description,Amount,Category\nVete,5000,mascotas'

    const { rows } = parseCsvContent(csv, undefined, cats)
    expect(rows).toHaveLength(1)
    expect(rows[0].categoryId).toBe('mascotas')
  })

  it('genera pending category para categoría totalmente nueva', async () => {
    const cats = await db.categories.toArray()
    const csv = 'Description,Amount,Category\nAlgo,1000,Inversiones Varias'

    const { rows, pendingCategories } = parseCsvContent(csv, undefined, cats)
    expect(rows).toHaveLength(1)
    expect(pendingCategories).toHaveLength(1)
    expect(pendingCategories[0].name).toBe('Inversiones Varias')
    expect(rows[0].categoryId).toBe('other_exp')  // fallback until created
  })
})
