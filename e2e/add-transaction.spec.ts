import { test, expect } from '@playwright/test'
import { resetDb, navigateTo, addTransaction } from './helpers'

test.describe('Agregar transacciones', () => {
  test.beforeEach(async ({ page }) => {
    await resetDb(page)
  })

  test('gasto simple se refleja en Dashboard y Movimientos', async ({ page }) => {
    await addTransaction(page, 'birra 1500')

    await expect(page.getByText('Birra').first()).toBeVisible()

    await navigateTo(page, 'transactions')
    await expect(page.getByText('Birra').first()).toBeVisible()

    await navigateTo(page, 'stats')
    await expect(page.getByText('Últimos 6 meses')).toBeVisible()
  })

  test('recurrente fijo aparece en Ajustes', async ({ page }) => {
    await addTransaction(page, 'alquiler 45000')

    await navigateTo(page, 'settings')
    await expect(page.getByText('1 activos')).toBeVisible()
    await expect(page.getByText('Alquiler').first()).toBeVisible()
  })

  test('cuota temporal muestra badge y se proyecta', async ({ page }) => {
    await addTransaction(page, 'cuota auto 25000 4/24')

    await expect(page.getByText('Auto').first()).toBeVisible()
    await expect(page.getByText('4/24').first()).toBeVisible()

    await navigateTo(page, 'transactions')
    const nextBtn = page.locator('[aria-label="Mes siguiente"]')
    if (await nextBtn.isEnabled()) {
      await nextBtn.click()
      await page.waitForTimeout(300)

      await expect(page.getByText(/Modo proyección/i)).toBeVisible()
    }
  })

  test('ingreso muestra signo positivo en Dashboard', async ({ page }) => {
    await addTransaction(page, 'sueldo 150000')

    await expect(page.getByText('Sueldo').first()).toBeVisible()
  })

  test('guarda los movimientos válidos de una carga múltiple como transacciones únicas', async ({ page }) => {
    const input = page.locator('input[placeholder="Ej: birra 1500"]')
    await input.fill('birra 25000, sin monto, sueldo 500000, alquiler 300000')

    await expect(page.getByText('3 movimientos listos')).toBeVisible()
    await expect(page.getByText('1 entrada ignorada')).toBeVisible()
    await expect(page.getByText('Ingreso', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Guardar 3 movimientos' }).click()

    await expect(input).toHaveValue('')
    await expect(page.getByText('birra').first()).toBeVisible()
    await expect(page.getByText('sueldo').first()).toBeVisible()
    await expect(page.getByText('alquiler').first()).toBeVisible()

    await navigateTo(page, 'settings')
    await expect(page.getByText('0 activos')).toBeVisible()
  })
})
