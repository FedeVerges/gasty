import { describe, it, expect, afterEach, vi } from 'vitest'
import { parseInput, parseAmountFromText } from '../src/lib/parser'

afterEach(() => {
  vi.useRealTimers()
})

describe('parser: gastos básicos', () => {
  it('parsea gasto simple con monto', () => {
    const result = parseInput('birra 1500')
    expect(result).not.toBeNull()
    expect(result?.type).toBe('expense')
    expect(result?.amount).toBe(1500)
    expect(result?.categoryId).toBe('leisure')
  })

  it('parsea gasto con símbolo $', () => {
    const result = parseInput('lomito $3000')
    expect(result?.amount).toBe(3000)
    expect(result?.categoryId).toBe('food')
  })

  it('parsea gasto con miles', () => {
    const result = parseInput('sueldo $150.000')
    expect(result?.amount).toBe(150000)
  })

  it('parsea gasto sin monto (devuelve null)', () => {
    const result = parseInput('internet')
    expect(result).toBeNull()
  })
})

describe('parser: ingresos', () => {
  it('detecta sueldo como ingreso', () => {
    const result = parseInput('sueldo 150000')
    expect(result?.type).toBe('income')
    expect(result?.categoryId).toBe('salary')
    expect(result?.amount).toBe(150000)
  })

  it('detecta venta como ingreso', () => {
    const result = parseInput('venta auto 500000')
    expect(result?.type).toBe('income')
    expect(result?.categoryId).toBe('other_inc')
  })
})

describe('parser: fechas', () => {
  it('usa hoy por defecto', () => {
    const result = parseInput('birra 1500')
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    const d = String(now.getDate()).padStart(2, '0')
    expect(result?.date).toBe(`${y}-${m}-${d}`)
  })

  it('parsea fecha con guión', () => {
    const result = parseInput('lomito 3000 20-5')
    expect(result?.date).toBe('2027-05-20')
  })

  it('parsea fecha con barra', () => {
    const result = parseInput('lomito 3000 20/7')
    expect(result?.date).toBe('2026-07-20')
  })

  it('parsea ayer', () => {
    const result = parseInput('birra 1000 ayer')
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const y = yesterday.getFullYear()
    const m = String(yesterday.getMonth() + 1).padStart(2, '0')
    const d = String(yesterday.getDate()).padStart(2, '0')
    expect(result?.date).toBe(`${y}-${m}-${d}`)
  })

  it('parsea nombre de mes', () => {
    const result = parseInput('sueldo 150000 junio')
    expect(result?.date).toBe('2027-06-01')
  })

  it('parsea nombre de mes con día', () => {
    const result = parseInput('sueldo 150000 15 junio')
    expect(result?.date).toBe('2027-06-15')
  })

  it('parsea mes pasado sin día al próximo año', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 6, 15, 12, 0))

    const result = parseInput('sueldo 150000 junio')
    expect(result?.date).toBe('2027-06-01')
  })
})

describe('parser: categorías', () => {
  it('detecta internet como servicios', () => {
    expect(parseInput('internet 8500')?.categoryId).toBe('services')
  })

  it('detecta alquiler como vivienda', () => {
    expect(parseInput('alquiler 45000')?.categoryId).toBe('home')
  })

  it('detecta nafta como transporte', () => {
    expect(parseInput('nafta 5000')?.categoryId).toBe('transport')
  })

  it('detecta farmacia como salud', () => {
    expect(parseInput('farmacia 3200')?.categoryId).toBe('health')
  })

  it('detecta super como supermercado', () => {
    expect(parseInput('super 15000')?.categoryId).toBe('supermarket')
  })
})

describe('parser: recurrentes', () => {
  it('detecta alquiler como recurrente fijo', () => {
    const result = parseInput('alquiler 45000')
    expect(result?.recurring.kind).toBe('fixed')
  })

  it('detecta expensas como recurrente fijo', () => {
    const result = parseInput('expensas 80000')
    expect(result?.recurring.kind).toBe('fixed')
  })

  it('parsea cuota temporal sin confundir monto con cuotas', () => {
    const result = parseInput('cuota auto 25000 4/24')
    expect(result?.amount).toBe(25000)
    expect(result?.recurring.kind).toBe('fixed_temporary')
    expect(result?.recurring.currentMonth).toBe(4)
    expect(result?.recurring.totalMonths).toBe(24)
  })

  it('gasto simple no es recurrente', () => {
    const result = parseInput('birra 1500')
    expect(result?.recurring.kind).toBe('none')
  })

  it('ignora cuota inválida y parsea monto correcto', () => {
    const result = parseInput('cuota auto 25000 0/24')
    expect(result?.amount).toBe(25000)
    expect(result?.recurring.kind).toBe('none')
  })

  it('ignora cuota inválida con current > total', () => {
    const result = parseInput('cuota auto 25000 25/24')
    expect(result?.amount).toBe(25000)
    expect(result?.recurring.kind).toBe('none')
  })

  it('ignora cuota inválida con total demasiado grande', () => {
    const result = parseInput('cuota auto 25000 1/500')
    expect(result?.amount).toBe(25000)
    expect(result?.recurring.kind).toBe('none')
  })
})

describe('parser: parseAmountFromText', () => {
  describe('formato argentino', () => {
    it('parsea "ARS 590,000.00" (coma=miles, punto=decimal)', () => {
      const { amount } = parseAmountFromText('ARS 590,000.00')
      expect(amount).toBe(590000)
    })

    it('parsea "ARS 590.000,00" (punto=miles, coma=decimal)', () => {
      const { amount } = parseAmountFromText('ARS 590.000,00')
      expect(amount).toBe(590000)
    })
  })

  describe('dólar y moneda', () => {
    it('parsea "$45.000" como 45000', () => {
      const { amount } = parseAmountFromText('$45.000')
      expect(amount).toBe(45000)
    })

    it('parsea "USD 1,500.50" como 1500.50', () => {
      const { amount } = parseAmountFromText('USD 1,500.50')
      expect(amount).toBe(1500.50)
    })

    it('parsea "pesos 35.000" como 35000', () => {
      const { amount } = parseAmountFromText('pesos 35.000')
      expect(amount).toBe(35000)
    })
  })

  describe('número simple', () => {
    it('parsea "45000" como 45000', () => {
      const { amount } = parseAmountFromText('45000')
      expect(amount).toBe(45000)
    })
  })

  describe('con opciones explícitas', () => {
    it('respeta thousandsSep y decimalSep cuando se proporcionan', () => {
      const { amount } = parseAmountFromText('1,234.56', {
        thousandsSep: ',',
        decimalSep: '.',
        stripCurrencyPrefix: true,
      })
      expect(amount).toBe(1234.56)
    })

    it('respeta formato argentino con opciones', () => {
      const { amount } = parseAmountFromText('1.234,56', {
        thousandsSep: '.',
        decimalSep: ',',
        stripCurrencyPrefix: true,
      })
      expect(amount).toBe(1234.56)
    })
  })

  describe('auto-detección', () => {
    it('detecta coma como decimal en "1.234,56"', () => {
      const { amount } = parseAmountFromText('1.234,56')
      expect(amount).toBe(1234.56)
    })

    it('detecta punto como decimal en "1,234.56"', () => {
      const { amount } = parseAmountFromText('1,234.56')
      expect(amount).toBe(1234.56)
    })
  })

  describe('casos vacíos y sin números', () => {
    it('devuelve 0 para string vacío', () => {
      const { amount } = parseAmountFromText('')
      expect(amount).toBe(0)
    })

    it('devuelve 0 para texto sin números', () => {
      const { amount } = parseAmountFromText('hello')
      expect(amount).toBe(0)
    })

    it('devuelve 0 para monto negativo', () => {
      const { amount } = parseAmountFromText('birra -1500')
      expect(amount).toBe(0)
    })

    it('devuelve 0 para monto cero', () => {
      const { amount } = parseAmountFromText('0')
      expect(amount).toBe(0)
    })
  })

  describe('texto mixto con número', () => {
    it('extrae monto de "alquiler 45.000"', () => {
      const { amount, remaining } = parseAmountFromText('alquiler 45.000')
      expect(amount).toBe(45000)
      expect(remaining).toContain('alquiler')
    })

    it('remaining contiene la descripción cuando hay texto mezclado', () => {
      const { remaining } = parseAmountFromText('supermercado 15000')
      expect(remaining).toContain('supermercado')
    })

    it('extrae último número cuando hay múltiples', () => {
      const { amount } = parseAmountFromText('cuota auto 25000 4/24')
      expect(amount).toBe(24)
    })
  })

  describe('prefijo de moneda', () => {
    it('elimina prefijo ARS por defecto', () => {
      const { amount, remaining } = parseAmountFromText('ARS 50000')
      expect(amount).toBe(50000)
      expect(remaining).not.toMatch(/ars/i)
    })

    it('no elimina prefijo cuando stripCurrencyPrefix es false', () => {
      const { amount, remaining } = parseAmountFromText('ARS 50000', {
        stripCurrencyPrefix: false,
      })
      expect(amount).toBe(50000)
      expect(remaining).toContain('ARS')
    })
  })
})
