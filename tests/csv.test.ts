import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import { db, seedDatabase } from '../src/lib/db'
import { parseCsvContent, executeImport } from '../src/lib/csv'
import type { CsvFormatSettings } from '../src/types'

describe('csv: parseCsvContent', () => {
  describe('formato con miles por coma y decimal por punto', () => {
    it('parsea CSV con "ARS 590,000.00" usando formato explícito', () => {
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

  describe('mapeo de categorías por nombre exacto', () => {
    it('matchea "Salud" por nombre exacto contra categoría existente', () => {
      const csv = `Description,Amount,Category
Terapia,5000,Salud`

      const { rows, pendingCategories } = parseCsvContent(csv)
      expect(rows).toHaveLength(1)
      expect(rows[0].categoryId).toBe('health')
      expect(rows[0].categoryName).toBe('Salud')
      expect(pendingCategories).toHaveLength(0)
    })

    it('matchea "Transporte" por nombre exacto', () => {
      const csv = `Description,Amount,Category
Uber,5000,Transporte`

      const { rows, pendingCategories } = parseCsvContent(csv)
      expect(rows).toHaveLength(1)
      expect(rows[0].categoryId).toBe('transport')
      expect(pendingCategories).toHaveLength(0)
    })

    it('genera pending category para "Alimentación" (no existe como categoría)', () => {
      const csv = `Description,Amount,Category
Super,12000,Alimentación`

      const { rows, pendingCategories } = parseCsvContent(csv)
      expect(rows).toHaveLength(1)
      expect(pendingCategories).toHaveLength(1)
      expect(pendingCategories[0].name).toBe('Alimentación')
    })

    it('genera pending category para "alimentacion" (sin acento, no existe)', () => {
      const csv = 'Description,Amount,Category\nSuper,12000,alimentacion'

      const { rows, pendingCategories } = parseCsvContent(csv)
      expect(rows).toHaveLength(1)
      expect(pendingCategories).toHaveLength(1)
      expect(pendingCategories[0].name).toBe('alimentacion')
    })

    it('genera pending category para "Finanzas y Deudas" (no existe como categoría)', () => {
      const csv = `Description,Amount,Category
Pago tarjeta,15000,Finanzas y Deudas`

      const { rows, pendingCategories } = parseCsvContent(csv)
      expect(rows).toHaveLength(1)
      expect(pendingCategories).toHaveLength(1)
      expect(pendingCategories[0].name).toBe('Finanzas y Deudas')
      expect(rows[0].categoryId).toBe('other_exp')  // fallback until created
      expect(rows[0].categoryName).toBe('Finanzas y Deudas')
    })

    it('genera pending category para "Hogar" (no existe como categoría)', () => {
      const csv = `Description,Amount,Category
Muebles,25000,Hogar`

      const { rows, pendingCategories } = parseCsvContent(csv)
      expect(rows).toHaveLength(1)
      expect(pendingCategories).toHaveLength(1)
      expect(pendingCategories[0].name).toBe('Hogar')
      expect(rows[0].categoryId).toBe('other_exp')
    })

    it('genera pending category para "Deporte" (no existe como categoría)', () => {
      const csv = `Description,Amount,Category
Gimnasio,5000,Deporte`

      const { rows, pendingCategories } = parseCsvContent(csv)
      expect(rows).toHaveLength(1)
      expect(pendingCategories).toHaveLength(1)
      expect(pendingCategories[0].name).toBe('Deporte')
    })

    it('genera pending category para "Servicios Públicos" (no existe)', () => {
      const csv = `Description,Amount,Category
Luz,3200,Servicios Públicos`

      const { rows, pendingCategories } = parseCsvContent(csv)
      expect(rows).toHaveLength(1)
      expect(pendingCategories).toHaveLength(1)
      expect(pendingCategories[0].name).toBe('Servicios Públicos')
    })

    it('genera pending category para "Suscripciones" (no existe)', () => {
      const csv = 'nombre,importe,fecha,categoria\nYouTube,1500,01/07/2026,Suscripciones'

      const { rows, pendingCategories } = parseCsvContent(csv)
      expect(rows).toHaveLength(1)
      expect(pendingCategories).toHaveLength(1)
      expect(pendingCategories[0].name).toBe('Suscripciones')
    })

    it('genera pending category para "Entretenimiento y Salidas a Comer"', () => {
      const csv = 'nombre,importe,fecha,categoria\nEntrada,30000,01/07/2026,Entretenimiento y Salidas a Comer'

      const format: CsvFormatSettings = {
        thousandsSeparator: ',',
        decimalSeparator: '.',
        stripCurrencyPrefix: true,
      }
      const { rows, pendingCategories } = parseCsvContent(csv, format)
      expect(rows).toHaveLength(1)
      expect(pendingCategories).toHaveLength(1)
      expect(pendingCategories[0].name).toBe('Entretenimiento y Salidas a Comer')
    })

    it('genera pending category para "AHORROS" (no existe)', () => {
      const csv = 'Description,Amount,Category\nAhorro,10000,AHORROS'

      const { rows, pendingCategories } = parseCsvContent(csv)
      expect(rows).toHaveLength(1)
      expect(pendingCategories).toHaveLength(1)
      expect(pendingCategories[0].name).toBe('AHORROS')
    })

    it('genera pending category para "transport" en inglés (no es nombre exacto)', () => {
      const csv = 'Description,Amount,Category\nUber,5000,transport'

      const { rows, pendingCategories } = parseCsvContent(csv)
      expect(rows).toHaveLength(1)
      expect(pendingCategories).toHaveLength(1)
      expect(pendingCategories[0].name).toBe('transport')
    })
  })

  describe('CsvRow.type', () => {
    it('asigna type income cuando la categoría existente es income', () => {
      const csv = `Description,Amount,Category
Sueldo,100000,Sueldo`

      const { rows } = parseCsvContent(csv)
      expect(rows).toHaveLength(1)
      expect(rows[0].type).toBe('income')
    })

    it('asigna type expense para categoría expense existente', () => {
      const csv = `Description,Amount,Category
Pan,500,Comida`

      const { rows } = parseCsvContent(csv)
      expect(rows).toHaveLength(1)
      expect(rows[0].type).toBe('expense')
    })

    it('asigna type expense por defecto para pending category', () => {
      const csv = `Description,Amount,Category
Algo,1000,Inversiones Varias`

      const { rows, pendingCategories } = parseCsvContent(csv)
      expect(rows).toHaveLength(1)
      expect(rows[0].type).toBe('expense')
      expect(pendingCategories[0].type).toBe('expense')
    })
  })

  describe('CsvPendingCategory.descriptions', () => {
    it('colecciona descripciones únicas en pending category', () => {
      const csv = `Description,Amount,Category
Compra acciones,50000,Inversiones
Venta bonos,30000,Inversiones
Compra acciones,20000,Inversiones`

      const { rows, pendingCategories } = parseCsvContent(csv)
      expect(rows).toHaveLength(3)
      expect(pendingCategories).toHaveLength(1)
      expect(pendingCategories[0].descriptions).toHaveLength(2)
      expect(pendingCategories[0].descriptions).toContain('Compra acciones')
      expect(pendingCategories[0].descriptions).toContain('Venta bonos')
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
      const csv = '\ufeffDescription,Amount\nAlquiler,45000\nInternet,8500'

      const { rows, errors } = parseCsvContent(csv)
      expect(errors).toHaveLength(0)
      expect(rows).toHaveLength(2)
      expect(rows[0].description).toBe('Alquiler')
      expect(rows[0].amount).toBe(45000)
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
    const result = await executeImport(rows)

    expect(result.imported).toBe(1)
    expect(result.errors).toBe(0)
  })

  it('crea categorías pendientes con descripciones como keywords', async () => {
    const csv = `Description,Amount,Category
Compra Galicia,50000,Finanzas y Deudas
Pago Naranja,30000,Finanzas y Deudas
Alquiler julio,100000,Hogar`

    const { rows, pendingCategories } = parseCsvContent(csv)
    expect(pendingCategories).toHaveLength(2)

    const result = await executeImport(rows, pendingCategories)
    expect(result.imported).toBe(3)
    expect(result.errors).toBe(0)

    const allCats = await db.categories.toArray()
    const finanzasCat = allCats.find((c) => c.id === 'csv_finanzas_y_deudas')
    const hogarCat = allCats.find((c) => c.id === 'csv_hogar')

    expect(finanzasCat).toBeDefined()
    expect(finanzasCat!.name).toBe('Finanzas y Deudas')
    expect(finanzasCat!.keywords).toContain('finanzas y deudas')
    expect(finanzasCat!.keywords).toContain('compra galicia')
    expect(finanzasCat!.keywords).toContain('pago naranja')
    expect(finanzasCat!.keywords).toHaveLength(3)

    expect(hogarCat).toBeDefined()
    expect(hogarCat!.name).toBe('Hogar')
    expect(hogarCat!.keywords).toContain('hogar')
    expect(hogarCat!.keywords).toContain('alquiler julio')

    const transactions = await db.transactions.toArray()
    const finanzasTxs = transactions.filter((t) => t.categoryId === 'csv_finanzas_y_deudas')
    const hogarTxs = transactions.filter((t) => t.categoryId === 'csv_hogar')
    expect(finanzasTxs).toHaveLength(2)
    expect(hogarTxs).toHaveLength(1)
  })

  it('usa row.type para determinar tipo de transacción', async () => {
    const cats = await db.categories.toArray()

    const csv = `Description,Amount,Category
Sueldo,50000,Sueldo`

    const { rows } = parseCsvContent(csv, undefined, cats)
    expect(rows[0].type).toBe('income')

    const result = await executeImport(rows)
    expect(result.imported).toBe(1)

    const tx = await db.transactions.toArray()
    expect(tx[0].type).toBe('income')
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

    const { rows, errors, pendingCategories } = parseCsvContent(csv, format)
    expect(errors).toHaveLength(0)
    expect(rows).toHaveLength(4)
    expect(rows[0].description).toBe('Pago Tarjeta Galicia')
    expect(rows[0].amount).toBe(590000)
    // "Finanzas y Deudas" no existe como categoría → pending
    expect(rows[0].categoryId).toBe('other_exp')
    expect(rows[1].amount).toBe(400000)
    // "Hogar" no existe → pending
    expect(rows[1].categoryId).toBe('other_exp')
    expect(rows[2].amount).toBe(160000)
    expect(rows[2].categoryId).toBe('health')  // "Salud" existe
    expect(rows[3].amount).toBe(1500)
    // "Suscripciones" no existe → pending
    expect(rows[3].categoryId).toBe('other_exp')

    expect(pendingCategories).toHaveLength(3)
    expect(pendingCategories.map((p) => p.name)).toContain('Finanzas y Deudas')
    expect(pendingCategories.map((p) => p.name)).toContain('Hogar')
    expect(pendingCategories.map((p) => p.name)).toContain('Suscripciones')
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

    const { rows, errors, pendingCategories } = parseCsvContent(csv, format)
    expect(errors).toHaveLength(0)
    expect(rows).toHaveLength(16)

    expect(rows[0].date).toBe('2026-07-01T00:00')
    expect(rows[0].description).toBe('Pago Tarjeta Galicia')
    expect(rows[0].amount).toBe(590000)
    expect(rows[0].categoryId).toBe('other_exp')  // pending

    // Categorías que existen por nombre → matched
    expect(rows[3].categoryId).toBe('health')      // Salud ✓
    expect(rows[9].categoryId).toBe('transport')   // Transporte ✓

    // Categorías que NO existen → pending
    expect(pendingCategories.length).toBeGreaterThan(0)
    const pendingNames = pendingCategories.map((p) => p.name)
    expect(pendingNames).toContain('Finanzas y Deudas')
    expect(pendingNames).toContain('Hogar')
    expect(pendingNames).toContain('Ahorros')
    expect(pendingNames).toContain('Deporte')
    expect(pendingNames).toContain('Servicios Públicos')
    expect(pendingNames).toContain('Alimentación')
    expect(pendingNames).toContain('Entretenimiento y Salidas a Comer')
    expect(pendingNames).toContain('Suscripciones')

    expect(rows[1].amount).toBe(400000)
    expect(rows[2].amount).toBe(300000)
    expect(rows[7].amount).toBe(77000)
    expect(rows[15].amount).toBe(1500)
  })

  it('colecciona descripciones únicas como keywords en pending categories', () => {
    const csv = `nombre,importe,fecha,categoria
Pago Tarjeta Galicia ,"ARS 590,000.00",01/07/2026,Finanzas y Deudas ,
Tarjeta Naranja ,"ARS 120,000.00",01/07/2026,Finanzas y Deudas ,
Tenis ,"ARS 92,000.00",01/07/2026,Deporte,
Club Junio ,"ARS 80,000.00",01/07/2026,Deporte,`

    const format: CsvFormatSettings = {
      thousandsSeparator: ',',
      decimalSeparator: '.',
      stripCurrencyPrefix: true,
    }

    const { pendingCategories } = parseCsvContent(csv, format)

    const finanzas = pendingCategories.find((p) => p.name === 'Finanzas y Deudas')
    expect(finanzas).toBeDefined()
    expect(finanzas!.descriptions).toHaveLength(2)
    expect(finanzas!.descriptions).toContain('Pago Tarjeta Galicia')
    expect(finanzas!.descriptions).toContain('Tarjeta Naranja')

    const deporte = pendingCategories.find((p) => p.name === 'Deporte')
    expect(deporte).toBeDefined()
    expect(deporte!.descriptions).toHaveLength(2)
    expect(deporte!.descriptions).toContain('Tenis')
    expect(deporte!.descriptions).toContain('Club Junio')
  })
})

describe('csv: parseCsvContent con categorías de usuario en DB', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
    await seedDatabase()

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

  it('matchea categoría de usuario con nombre en minúsculas', async () => {
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

  it('no duplica pending category cuando varias filas tienen la misma categoría', async () => {
    const cats = await db.categories.toArray()
    const csv = 'Description,Amount,Category\nAlgo,1000,Nueva Cat\nOtra cosa,2000,Nueva Cat'

    const { rows, pendingCategories } = parseCsvContent(csv, undefined, cats)
    expect(rows).toHaveLength(2)
    expect(pendingCategories).toHaveLength(1)
    expect(pendingCategories[0].descriptions).toHaveLength(2)
  })
})
