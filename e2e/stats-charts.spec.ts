import { test, expect } from '@playwright/test'
import { resetDb, addTransaction, navigateTo } from './helpers'

test.describe('Stats charts', () => {
  test.beforeEach(async ({ page }) => {
    await resetDb(page)
  })

  test('Stats muestra título y gráfico de barras 6 meses', async ({ page }) => {
    await addTransaction(page, 'gasto 15000')

    await navigateTo(page, 'stats')
    await expect(page.getByText('Stats').first()).toBeVisible()
    await expect(page.getByText('Últimos 6 meses')).toBeVisible()

    // SVG bar chart debería existir
    const svg = page.locator('svg').first()
    await expect(svg).toBeVisible()
  })

  test('Stats muestra total y promedio 6 meses', async ({ page }) => {
    await addTransaction(page, 'super 10000')
    await addTransaction(page, 'birra 3000')

    await navigateTo(page, 'stats')

    await expect(page.getByText('promedio')).toBeVisible()
  })

  test('Stats muestra donut chart por categoría', async ({ page }) => {
    await addTransaction(page, 'birra 3000')
    await addTransaction(page, 'super 15000')

    await navigateTo(page, 'stats')

    await expect(page.getByText('Por categoría')).toBeVisible()
  })

  test('Stats muestra top categoría del mes', async ({ page }) => {
    await addTransaction(page, 'super 25000')
    await addTransaction(page, 'birra 3000')

    await navigateTo(page, 'stats')

    await expect(page.getByText('Top categoría del mes')).toBeVisible()
  })

  test('Stats muestra empty state sin gastos', async ({ page }) => {
    await navigateTo(page, 'stats')

    await expect(page.getByText('Sin gastos este mes todavía')).toBeVisible()
  })

  test('Stats month selector funciona', async ({ page }) => {
    await addTransaction(page, 'gasto 5000')

    await navigateTo(page, 'stats')

    const monthLabel = page.locator('.text-base.font-bold').first()
    const initialText = await monthLabel.textContent()

    await page.locator('[aria-label="Mes anterior"]').click()
    await page.waitForTimeout(300)

    const prevText = await monthLabel.textContent()
    expect(prevText).not.toBe(initialText)
  })

  test('Stats muestra proyección para mes futuro', async ({ page }) => {
    await addTransaction(page, 'alquiler 45000')

    await navigateTo(page, 'stats')

    const nextBtn = page.locator('[aria-label="Mes siguiente"]')
    if (await nextBtn.isEnabled()) {
      await nextBtn.click()
      await page.waitForTimeout(500)

      await expect(page.getByText('Proyección — stats basados')).toBeVisible()
    }
  })
})
