import { describe, it, expect } from 'vitest'
import { getFlashSuggestions } from '../src/lib/flash'

describe('flash: time-of-day', () => {
  it('sugiere cafe y desayuno en la mañana (6-8:59)', () => {
    const morning = new Date(2026, 5, 15, 7, 30)
    const suggestions = getFlashSuggestions(morning)
    const texts = suggestions.map((s) => s.text)
    expect(texts).toContain('cafe 1500')
    expect(texts).toContain('desayuno 2000')
  })

  it('sugiere almuerzo al mediodía (12-13:59)', () => {
    const noon = new Date(2026, 5, 15, 12, 30)
    const suggestions = getFlashSuggestions(noon)
    const texts = suggestions.map((s) => s.text)
    expect(texts).toContain('almuerzo 5000')
    expect(texts).toContain('menu 4500')
  })

  it('sugiere cafe y merienda por la tarde (14-16:59)', () => {
    const afternoon = new Date(2026, 5, 15, 15, 0)
    const suggestions = getFlashSuggestions(afternoon)
    const texts = suggestions.map((s) => s.text)
    expect(texts).toContain('cafe 1500')
    expect(texts).toContain('merienda 2000')
  })

  it('sugiere cena y birra a la noche (20-22:59)', () => {
    const night = new Date(2026, 5, 15, 21, 0)
    const suggestions = getFlashSuggestions(night)
    const texts = suggestions.map((s) => s.text)
    expect(texts).toContain('cena 5000')
    expect(texts).toContain('birra 1500')
  })

  it('sugiere delivery y kiosco muy noche (23-5:59)', () => {
    const latenight = new Date(2026, 5, 15, 23, 30)
    const suggestions = getFlashSuggestions(latenight)
    const texts = suggestions.map((s) => s.text)
    expect(texts).toContain('delivery 5000')
    expect(texts).toContain('kiosco 1000')
  })

  it('conmuta correctamente de 11:59 a 12:00', () => {
    const preNoon = new Date(2026, 5, 15, 11, 59)
    const postNoon = new Date(2026, 5, 15, 12, 0)

    const pre = getFlashSuggestions(preNoon).map((s) => s.text)
    const post = getFlashSuggestions(postNoon).map((s) => s.text)

    expect(pre).toContain('cafe 1500')
    expect(post).toContain('almuerzo 5000')
    expect(post).not.toContain('cafe 1500')
  })
})

describe('flash: day-of-month', () => {
  it('sugiere alquiler, expensas, internet y luz en primeros 10 días', () => {
    const early = new Date(2026, 5, 5, 10, 0)
    const suggestions = getFlashSuggestions(early)
    const texts = suggestions.map((s) => s.text)
    expect(texts).toContain('alquiler 45000')
    expect(texts).toContain('expensas 10000')
    expect(texts).toContain('internet 5000')
    expect(texts).toContain('luz 3000')
  })

  it('sugiere celular y gas en días 11-20', () => {
    const mid = new Date(2026, 5, 15, 10, 0)
    const suggestions = getFlashSuggestions(mid)
    const texts = suggestions.map((s) => s.text)
    expect(texts).toContain('celular 5000')
    expect(texts).toContain('gas 2500')
  })

  it('sugiere super y nafta en días 21+', () => {
    const late = new Date(2026, 5, 25, 10, 0)
    const suggestions = getFlashSuggestions(late)
    const texts = suggestions.map((s) => s.text)
    expect(texts).toContain('super 8000')
    expect(texts).toContain('nafta 15000')
  })
})

describe('flash: weekend', () => {
  it('sugiere salida y birra los fines de semana', () => {
    const saturday = new Date(2026, 5, 13, 20, 0) // Saturday
    const suggestions = getFlashSuggestions(saturday)
    const texts = suggestions.map((s) => s.text)
    expect(texts).toContain('birra 2000')
  })

  it('sugiere almuerzo finde los sábados al mediodía', () => {
    const saturdayNoon = new Date(2026, 5, 13, 13, 0) // Saturday
    const suggestions = getFlashSuggestions(saturdayNoon)
    const texts = suggestions.map((s) => s.text)
    expect(texts).toContain('almuerzo 6000')
  })

  it('no sugiere salida los días de semana', () => {
    const tuesday = new Date(2026, 5, 16, 20, 0) // Tuesday
    const suggestions = getFlashSuggestions(tuesday)
    const texts = suggestions.map((s) => s.text)
    // Birra 2000 is weekend-specific
    expect(texts).not.toContain('almuerzo 6000')
  })
})

describe('flash: always includes income', () => {
  it('siempre incluye sueldo', () => {
    const anyDate = new Date(2026, 5, 15, 12, 0)
    const suggestions = getFlashSuggestions(anyDate)
    const texts = suggestions.map((s) => s.text)
    expect(texts).toContain('sueldo 150000')
  })
})

describe('flash: deduplication', () => {
  it('no tiene duplicados por texto', () => {
    const date = new Date(2026, 5, 15, 12, 0)
    const suggestions = getFlashSuggestions(date)
    const texts = suggestions.map((s) => s.text)
    const unique = new Set(texts)
    expect(unique.size).toBe(texts.length)
  })
})
