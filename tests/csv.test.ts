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

    it('matchea "Alimentación" por nombre exacto contra categoría default', () => {
      const csv = `Description,Amount,Category
Super,12000,Alimentación`

      const { rows, pendingCategories } = parseCsvContent(csv)
      expect(rows).toHaveLength(1)
      expect(rows[0].categoryId).toBe('food_exp')
      expect(rows[0].categoryName).toBe('Alimentación')
      expect(pendingCategories).toHaveLength(0)
    })

    it('matchea "alimentacion" (sin acento) por normalización', () => {
      const csv = 'Description,Amount,Category\nSuper,12000,alimentacion'

      const { rows, pendingCategories } = parseCsvContent(csv)
      expect(rows).toHaveLength(1)
      expect(rows[0].categoryId).toBe('food_exp')
      expect(pendingCategories).toHaveLength(0)
    })

    it('matchea "Finanzas y Deudas" por nombre exacto contra categoría default', () => {
      const csv = `Description,Amount,Category
Pago tarjeta,15000,Finanzas y Deudas`

      const { rows, pendingCategories } = parseCsvContent(csv)
      expect(rows).toHaveLength(1)
      expect(rows[0].categoryId).toBe('debts')
      expect(rows[0].categoryName).toBe('Finanzas y Deudas')
      expect(pendingCategories).toHaveLength(0)
    })

    it('matchea "Hogar" por nombre exacto contra categoría default', () => {
      const csv = `Description,Amount,Category
Muebles,25000,Hogar`

      const { rows, pendingCategories } = parseCsvContent(csv)
      expect(rows).toHaveLength(1)
      expect(rows[0].categoryId).toBe('household')
      expect(pendingCategories).toHaveLength(0)
    })

    it('matchea "Deporte" por nombre exacto contra categoría default', () => {
      const csv = `Description,Amount,Category
Gimnasio,5000,Deporte`

      const { rows, pendingCategories } = parseCsvContent(csv)
      expect(rows).toHaveLength(1)
      expect(rows[0].categoryId).toBe('deportes')
      expect(pendingCategories).toHaveLength(0)
    })

    it('genera pending category para "Servicios Públicos" (no coincide con "Servicios")', () => {
      const csv = `Description,Amount,Category
Luz,3200,Servicios Públicos`

      const { rows, pendingCategories } = parseCsvContent(csv)
      expect(rows).toHaveLength(1)
      expect(pendingCategories).toHaveLength(1)
      expect(pendingCategories[0].name).toBe('Servicios Públicos')
    })

    it('matchea "Suscripciones" por nombre exacto contra categoría default', () => {
      const csv = 'nombre,importe,fecha,categoria\nYouTube,1500,01/07/2026,Suscripciones'

      const { rows, pendingCategories } = parseCsvContent(csv)
      expect(rows).toHaveLength(1)
      expect(rows[0].categoryId).toBe('subscriptions')
      expect(pendingCategories).toHaveLength(0)
    })

    it('genera pending category para "Entretenimiento y Salidas a Comer" (no coincide con "Entretenimiento")', () => {
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

    it('matchea "AHORROS" por normalización contra categoría default', () => {
      const csv = 'Description,Amount,Category\nAhorro,10000,AHORROS'

      const { rows, pendingCategories } = parseCsvContent(csv)
      expect(rows).toHaveLength(1)
      expect(rows[0].categoryId).toBe('savings')
      expect(pendingCategories).toHaveLength(0)
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

  it('crea categorías pendientes para categorías no existentes y asigna keywords', async () => {
    const csv = `Description,Amount,Category
Compra Galicia,50000,Finanzas y Deudas
Pago Naranja,30000,Finanzas y Deudas
Alquiler julio,100000,Hogar`

    const { rows, pendingCategories } = parseCsvContent(csv)
    // "Finanzas y Deudas" y "Hogar" ahora son defaults → no pending
    expect(pendingCategories).toHaveLength(0)

    const result = await executeImport(rows, pendingCategories)
    expect(result.imported).toBe(3)
    expect(result.errors).toBe(0)

    const transactions = await db.transactions.toArray()
    const finanzasTxs = transactions.filter((t) => t.categoryId === 'debts')
    const hogarTxs = transactions.filter((t) => t.categoryId === 'household')
    expect(finanzasTxs).toHaveLength(2)
    expect(hogarTxs).toHaveLength(1)
  })

  it('crea pending categories para nombres que no coinciden con defaults', async () => {
    const csv = `Description,Amount,Category
Luz,5000,Servicios Públicos
Gas,3000,Servicios Públicos`

    const { rows, pendingCategories } = parseCsvContent(csv)
    // "Servicios Públicos" no coincide con "Servicios" → pending
    expect(pendingCategories).toHaveLength(1)
    expect(pendingCategories[0].name).toBe('Servicios Públicos')

    const result = await executeImport(rows, pendingCategories)
    expect(result.imported).toBe(2)

    const allCats = await db.categories.toArray()
    const serviciosCat = allCats.find((c) => c.id === 'csv_servicios_publicos')
    expect(serviciosCat).toBeDefined()
    expect(serviciosCat!.name).toBe('Servicios Públicos')
    expect(serviciosCat!.keywords).toContain('servicios públicos')
    expect(serviciosCat!.keywords).toContain('luz')
    expect(serviciosCat!.keywords).toContain('gas')
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
    expect(rows[0].categoryId).toBe('debts')     // "Finanzas y Deudas" → default
    expect(rows[1].amount).toBe(400000)
    expect(rows[1].categoryId).toBe('household') // "Hogar" → default
    expect(rows[2].amount).toBe(160000)
    expect(rows[2].categoryId).toBe('health')    // "Salud" existe
    expect(rows[3].amount).toBe(1500)
    expect(rows[3].categoryId).toBe('subscriptions') // "Suscripciones" → default

    // Todas son defaults, no hay pending
    expect(pendingCategories).toHaveLength(0)
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

    expect(rows[0].date).toBe('2026-07-01')
    expect(rows[0].description).toBe('Pago Tarjeta Galicia')
    expect(rows[0].amount).toBe(590000)
    expect(rows[0].categoryId).toBe('debts')          // "Finanzas y Deudas" → default

    // Categorías que existen por nombre → matched
    expect(rows[2].categoryId).toBe('savings')        // Ahorros → default
    expect(rows[3].categoryId).toBe('health')         // Salud ✓
    expect(rows[5].categoryId).toBe('deportes')       // Deporte → default
    expect(rows[9].categoryId).toBe('transport')      // Transporte ✓
    expect(rows[10].categoryId).toBe('food_exp')      // Alimentación → default
    expect(rows[15].categoryId).toBe('subscriptions') // Suscripciones → default

    // Solo "Servicios Públicos" y "Entretenimiento y Salidas a Comer" son pending
    // (no coinciden exactamente con defaults existentes)
    expect(pendingCategories).toHaveLength(2)
    const pendingNames = pendingCategories.map((p) => p.name)
    expect(pendingNames).toContain('Servicios Públicos')
    expect(pendingNames).toContain('Entretenimiento y Salidas a Comer')

    expect(rows[1].amount).toBe(400000)
    expect(rows[2].amount).toBe(300000)
    expect(rows[7].amount).toBe(77000)
    expect(rows[15].amount).toBe(1500)
  })

  it('procesa CSV con headers "Concepto,Importe,Fecha,Categoría" (estilo Notion)', () => {
    const csv = `Concepto,Importe,Fecha,"Categoría "
Alquiler + expesas Julio,"ARS 400,000.00",01/07/2026,Hogar
Ahorro,"ARS 300,000.00",01/07/2026,Ahorros
Carne,"ARS 45,000.00",05/06/2026,Alimentación
Bayahibe,"ARS 566,000.00",03/05/2026 → 12/05/2026,Viajes`

    const format: CsvFormatSettings = {
      thousandsSeparator: ',',
      decimalSeparator: '.',
      stripCurrencyPrefix: true,
    }

    const { rows, errors } = parseCsvContent(csv, format)
    expect(errors).toHaveLength(0)

    // Fechas correctas (no hoy)
    expect(rows[0].date).toBe('2026-07-01')
    expect(rows[0].description).toBe('Alquiler + expesas Julio')
    expect(rows[0].amount).toBe(400000)

    expect(rows[1].date).toBe('2026-07-01')
    expect(rows[1].description).toBe('Ahorro')

    expect(rows[2].date).toBe('2026-06-05')
    expect(rows[2].description).toBe('Carne')

    // Fila con rango de fechas "03/05/2026 → 12/05/2026" → fallback a hoy
    // La fecha exacta depende de cuando se corre el test; solo verificar que no es 2026-05-03
    expect(rows[3].date).not.toBe('2026-05-03')
    expect(rows[3].amount).toBe(566000)
  })

  it('colecciona descripciones únicas como keywords en pending categories', () => {
    const csv = `nombre,importe,fecha,categoria
Luz ,"ARS 60,000.00",01/07/2026,Servicios Públicos,
Gas ,"ARS 23,000.00",01/07/2026,Servicios Públicos ,
Internet ,"ARS 35,000.00",01/07/2026,Servicios Públicos,
Entrada Gorillaz ,"ARS 30,000.00",01/07/2026,Entretenimiento y Salidas a Comer,
Cena amigos ,"ARS 22,000.00",01/07/2026,Entretenimiento y Salidas a Comer,`

    const format: CsvFormatSettings = {
      thousandsSeparator: ',',
      decimalSeparator: '.',
      stripCurrencyPrefix: true,
    }

    const { pendingCategories } = parseCsvContent(csv, format)

    const servicios = pendingCategories.find((p) => p.name === 'Servicios Públicos')
    expect(servicios).toBeDefined()
    expect(servicios!.descriptions).toHaveLength(3)
    expect(servicios!.descriptions).toContain('Luz')
    expect(servicios!.descriptions).toContain('Gas')
    expect(servicios!.descriptions).toContain('Internet')

    const entretenimiento = pendingCategories.find((p) => p.name === 'Entretenimiento y Salidas a Comer')
    expect(entretenimiento).toBeDefined()
    expect(entretenimiento!.descriptions).toHaveLength(2)
    expect(entretenimiento!.descriptions).toContain('Entrada Gorillaz')
    expect(entretenimiento!.descriptions).toContain('Cena amigos')
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
