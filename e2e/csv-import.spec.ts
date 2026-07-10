import { test, expect } from '@playwright/test'
import { resetDb, navigateTo } from './helpers'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const CSV_PATH = path.resolve(__dirname, 'fixtures', 'test.csv')

test.describe('Importación CSV', () => {
  test.beforeEach(async ({ page }) => {
    await resetDb(page)
  })

  test('importa CSV y verifica resultado + items', async ({ page }) => {
    await navigateTo(page, 'settings')

    await page.getByRole('button', { name: 'Importar CSV' }).click()
    await page.waitForTimeout(300)

    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(CSV_PATH)
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
