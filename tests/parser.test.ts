import { describe, it, expect } from 'vitest'
import { parseInput } from '../src/lib/parser'

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
    expect(result?.date).toBe('2026-05-20')
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
    expect(result?.date).toMatch(/^\d{4}-06-/)
  })

  it('parsea nombre de mes con día', () => {
    const result = parseInput('sueldo 150000 15 junio')
    expect(result?.date).toMatch(/^\d{4}-06-15$/)
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

  it('detecta alquiler como recurrente fijo', () => {
    const result = parseInput('alquiler 45000')
    expect(result?.recurring.kind).toBe('fixed')
  })

  it('detecta expensas como recurrente fijo', () => {
    const result = parseInput('expensas 80000')
    expect(result?.recurring.kind).toBe('fixed')
  })

  it('detecta cuotas X/Y como recurrente temporal', () => {
    const result = parseInput('cuota auto 25000 4/24')
    expect(result?.recurring.kind).toBe('fixed_temporary')
    expect(result?.recurring.currentMonth).toBe(4)
    expect(result?.recurring.totalMonths).toBe(24)
  })

  it('gasto simple no es recurrente', () => {
    const result = parseInput('birra 1500')
    expect(result?.recurring.kind).toBe('none')
  })
})
