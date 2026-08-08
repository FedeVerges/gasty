import { test, expect } from '@playwright/test'
import { resetDb, navigateTo } from './helpers'

function fmtDate(d: Date, day: number): string {
  return `${String(day).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

test.describe('Importación CSV', () => {
  test.beforeEach(async ({ page }) => {
    await resetDb(page)
  })

  test('importa CSV y verifica resultado + items', async ({ page }) => {
    // Fixture generado relativo al mes actual (now-1) para que aparezca al retroceder un mes
    const now = new Date()
    const m1 = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const csvContent = [
      'nombre,importe,fecha,categoría',
      `Alquiler,45000,${fmtDate(m1, 1)},Vivienda`,
      `Supermercado,15000,${fmtDate(m1, 5)},Supermercado`,
      `Birra,2500,${fmtDate(m1, 10)},Ocio`,
      `Internet,12000,${fmtDate(m1, 15)},Servicios`,
      `Nafta,8000,${fmtDate(m1, 18)},Transporte`,
      `Farmacia,3500,${fmtDate(m1, 20)},Salud`,
      `Curso online,15000,${fmtDate(m1, 22)},Educación`,
      `Restaurante,6000,${fmtDate(m1, 25)},Comida`,
      `Mantenimiento,20000,${fmtDate(m1, 28)},Reparaciones`,
      `Sueldo,200000,${fmtDate(m1, 30)},Salario`,
    ].join('\n')

    await navigateTo(page, 'settings')

    await page.getByRole('button', { name: 'Importar CSV' }).click()
    await page.waitForTimeout(300)

    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'test.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent),
    })
    await page.waitForTimeout(500)

    await expect(page.getByRole('heading', { name: /Vista previa/i })).toBeVisible()

    await page.getByRole('button', { name: /Importar \d+ filas/i }).click()
    await page.waitForTimeout(500)

    await expect(page.getByRole('heading', { name: /Resultado/i })).toBeVisible()
    await expect(page.getByText(/gastos importados/i)).toBeVisible()

    await page.getByRole('button', { name: 'Cerrar' }).last().click()
    await page.waitForTimeout(300)

    await navigateTo(page, 'transactions')

    const prevBtn = page.locator('[aria-label="Mes anterior"]')
    await prevBtn.click()
    await page.waitForTimeout(300)

    await expect(page.getByText('Alquiler').first()).toBeVisible()
    await expect(page.getByText('Supermercado').first()).toBeVisible()
    await expect(page.getByText('Nafta').first()).toBeVisible()
  })
})
