import { test, expect } from '@playwright/test'
import { resetDb, navigateTo } from './helpers'

const MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

function shiftMonth(base: Date, delta: number): Date {
  return new Date(base.getFullYear(), base.getMonth() + delta, 1)
}

function monthName(d: Date): string {
  return MONTHS[d.getMonth()]
}

function monthLabel(d: Date): string {
  return `${monthName(d).charAt(0).toUpperCase() + monthName(d).slice(1)} ${d.getFullYear()}`
}

function fmtDate(d: Date, day: number): string {
  return `${String(day).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

function isoDate(d: Date, day: number): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

test.describe('CSV: fechas DD/MM/YYYY y variantes', () => {
  test.beforeEach(async ({ page }) => {
    await resetDb(page)
  })

  test('importa CSV con fechas de meses pasados y verifica que se vean en el mes correcto', async ({ page }) => {
    // Fixture generado relativo al mes actual: now-1, now-2 y now-3
    const now = new Date()
    const m1 = shiftMonth(now, -1)
    const m2 = shiftMonth(now, -2)
    const m3 = shiftMonth(now, -3)

    const csvContent = [
      'Concepto,Importe,Fecha,Categoría',
      `Alquiler ${monthName(m1)},45000,${fmtDate(m1, 1)},Vivienda`,
      `Supermercado ${monthName(m1)},15000,${fmtDate(m1, 20)},Supermercado`,
      `Alquiler ${monthName(m2)},45000,${fmtDate(m2, 1)},Vivienda`,
      `Supermercado ${monthName(m2)},15000,${fmtDate(m2, 15)},Supermercado`,
      `Alquiler ${monthName(m3)},45000,${fmtDate(m3, 1)},Vivienda`,
      `Supermercado ${monthName(m3)},15000,${fmtDate(m3, 15)},Supermercado`,
    ].join('\n')

    // ── 1. Ir a settings e importar CSV ──
    await navigateTo(page, 'settings')
    await page.getByRole('button', { name: 'Importar CSV' }).click()
    await page.waitForTimeout(300)

    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'dates-variants.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent),
    })
    await page.waitForTimeout(500)

    // ── 2. Preview: verificar que las fechas se muestran como YYYY-MM-DD (sin T00:00) ──
    await expect(page.getByRole('heading', { name: /Vista previa/i })).toBeVisible()

    await expect(page.getByText(isoDate(m1, 1)).first()).toBeVisible()
    await expect(page.getByText(isoDate(m1, 20)).first()).toBeVisible()
    await expect(page.getByText(isoDate(m2, 1)).first()).toBeVisible()
    await expect(page.getByText(isoDate(m2, 15)).first()).toBeVisible()
    await expect(page.getByText(isoDate(m3, 1)).first()).toBeVisible()
    await expect(page.getByText(isoDate(m3, 15)).first()).toBeVisible()

    // ── 3. Importar ──
    await page.getByRole('button', { name: /Importar \d+ filas/i }).click()
    await page.waitForTimeout(500)

    await expect(page.getByRole('heading', { name: /Resultado/i })).toBeVisible()
    await expect(page.getByText(/gastos importados/i)).toBeVisible()

    await page.getByRole('button', { name: 'Cerrar' }).last().click()
    await page.waitForTimeout(300)

    // ── 4. Ir a Movimientos ──
    await navigateTo(page, 'transactions')
    await page.waitForTimeout(300)

    const prevBtn = page.locator('[aria-label="Mes anterior"]')

    // ── 5. Mes actual — sin movimientos importados ──
    await expect(page.getByText(monthLabel(now)).first()).toBeVisible()
    await expect(page.getByText('Sin movimientos')).toBeVisible()

    // ── 6. Retroceder a now-1 ──
    await prevBtn.click()
    await page.waitForTimeout(300)
    await expect(page.getByText(monthLabel(m1)).first()).toBeVisible()
    await expect(page.getByText(`Alquiler ${monthName(m1)}`).first()).toBeVisible()
    await expect(page.getByText(`Supermercado ${monthName(m1)}`).first()).toBeVisible()

    // ── 7. Retroceder a now-2 ──
    await prevBtn.click()
    await page.waitForTimeout(300)
    await expect(page.getByText(monthLabel(m2)).first()).toBeVisible()
    await expect(page.getByText(`Alquiler ${monthName(m2)}`).first()).toBeVisible()
    await expect(page.getByText(`Supermercado ${monthName(m2)}`).first()).toBeVisible()

    // ── 8. Retroceder a now-3 ──
    await prevBtn.click()
    await page.waitForTimeout(300)
    await expect(page.getByText(monthLabel(m3)).first()).toBeVisible()
    await expect(page.getByText(`Alquiler ${monthName(m3)}`).first()).toBeVisible()
    await expect(page.getByText(`Supermercado ${monthName(m3)}`).first()).toBeVisible()
  })
})
