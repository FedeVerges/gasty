import { test, expect } from '@playwright/test'
import { resetDb, navigateTo } from './helpers'

test.describe('Ajustes', () => {
  test.beforeEach(async ({ page }) => {
    await resetDb(page)
  })

  test('cambia tema a oscuro y a claro', async ({ page }) => {
    await navigateTo(page, 'settings')

    await page.getByRole('button', { name: 'Oscuro' }).click()
    await page.waitForTimeout(200)

    const themeAttr = await page.locator('html').getAttribute('data-theme')
    expect(themeAttr).toBe('dark')

    await page.getByRole('button', { name: 'Claro' }).click()
    await page.waitForTimeout(200)

    const themeAttr2 = await page.locator('html').getAttribute('data-theme')
    expect(themeAttr2).toBe('light')
  })
})
