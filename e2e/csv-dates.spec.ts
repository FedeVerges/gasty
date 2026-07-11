import { test, expect } from '@playwright/test'
import { resetDb, navigateTo } from './helpers'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const CSV_PATH = path.resolve(__dirname, 'fixtures', 'dates-variants.csv')

test.describe('CSV: fechas DD/MM/YYYY y variantes', () => {
  test.beforeEach(async ({ page }) => {
    await resetDb(page)
  })

  test('importa CSV con fechas de meses pasados y verifica que se vean en el mes correcto', async ({ page }) => {
    // ── 1. Ir a settings e importar CSV ──
    await navigateTo(page, 'settings')
    await page.getByRole('button', { name: 'Importar CSV' }).click()
    await page.waitForTimeout(300)

    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(CSV_PATH)
    await page.waitForTimeout(500)

    // ── 2. Preview: verificar que las fechas se muestran como YYYY-MM-DD (sin T00:00) ──
    await expect(page.getByRole('heading', { name: /Vista previa/i })).toBeVisible()

    // Las filas muestran la fecha en un <span> con clase text-xs text-mute
    // Verificamos que aparezcan las fechas ISO correctas (no "hoy")
    await expect(page.getByText('2026-06-01').first()).toBeVisible()
    await expect(page.getByText('2026-06-20').first()).toBeVisible()
    await expect(page.getByText('2026-05-01').first()).toBeVisible()
    await expect(page.getByText('2026-05-15').first()).toBeVisible()
    await expect(page.getByText('2026-04-01').first()).toBeVisible()
    await expect(page.getByText('2026-04-15').first()).toBeVisible()

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
    const nextBtn = page.locator('[aria-label="Mes siguiente"]')

    // ── 5. Mes actual (Julio 2026) — sin movimientos importados ──
    await expect(page.getByText(/Julio 2026/i).first()).toBeVisible()
    await expect(page.getByText('Sin movimientos')).toBeVisible()

    // ── 6. Retroceder a Junio 2026 ──
    await prevBtn.click()
    await page.waitForTimeout(300)
    await expect(page.getByText(/Junio 2026/i).first()).toBeVisible()
    await expect(page.getByText('Alquiler Junio').first()).toBeVisible()
    await expect(page.getByText('Supermercado Junio').first()).toBeVisible()

    // ── 7. Retroceder a Mayo 2026 ──
    await prevBtn.click()
    await page.waitForTimeout(300)
    await expect(page.getByText(/Mayo 2026/i).first()).toBeVisible()
    await expect(page.getByText('Alquiler Mayo').first()).toBeVisible()
    await expect(page.getByText('Supermercado Mayo').first()).toBeVisible()

    // ── 8. Retroceder a Abril 2026 ──
    await prevBtn.click()
    await page.waitForTimeout(300)
    await expect(page.getByText(/Abril 2026/i).first()).toBeVisible()
    await expect(page.getByText('Alquiler Abril').first()).toBeVisible()
    await expect(page.getByText('Supermercado Abril').first()).toBeVisible()
  })
})
