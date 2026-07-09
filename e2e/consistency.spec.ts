import { test, expect } from '@playwright/test'
import { resetDb, navigateTo, addTransaction } from './helpers'

test.describe('Consistencia entre pantallas', () => {
  test.beforeEach(async ({ page }) => {
    await resetDb(page)
  })

  test('múltiples transacciones mantienen consistencia', async ({ page }) => {
    await addTransaction(page, 'sueldo 200000')
    await addTransaction(page, 'alquiler 45000')
    await addTransaction(page, 'super 15000')
    await addTransaction(page, 'birra 2500')

    await expect(page.getByText('Sueldo').first()).toBeVisible()
    await expect(page.getByText('Alquiler').first()).toBeVisible()
    await expect(page.getByText('Super').first()).toBeVisible()
    await expect(page.getByText('Birra').first()).toBeVisible()

    const balanceEl = page.locator('text=Disponible').first()
    await expect(balanceEl).toBeVisible()

    const positiveText = page.locator('text=+').first()
    await expect(positiveText).toBeVisible()

    await navigateTo(page, 'transactions')
    await expect(page.getByText('Balance').first()).toBeVisible()

    await navigateTo(page, 'stats')
    await expect(page.getByText('Últimos 6 meses')).toBeVisible()
  })
})
