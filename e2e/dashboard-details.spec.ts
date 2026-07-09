import { test, expect } from '@playwright/test'
import { resetDb, addTransaction } from './helpers'

test.describe('Dashboard detalles', () => {
  test.beforeEach(async ({ page }) => {
    await resetDb(page)
  })

  test('BalanceCard muestra Disponible y Gastado', async ({ page }) => {
    await addTransaction(page, 'sueldo 200000')
    await addTransaction(page, 'gasto 50000')

    await expect(page.getByText('Disponible').first()).toBeVisible()
    await expect(page.getByText('Gastado').first()).toBeVisible()
  })

  test('BalanceCard muestra barra de progreso con ingresos', async ({ page }) => {
    await addTransaction(page, 'sueldo 100000')
    await addTransaction(page, 'gasto 30000')

    // Debería ver el porcentaje de uso
    await expect(page.getByText('% de los ingresos')).toBeVisible()
  })

  test('MonthSelector funciona en Dashboard', async ({ page }) => {
    await addTransaction(page, 'super 15000')

    const monthLabel = page.locator('.text-base.font-bold').first()
    const initialText = await monthLabel.textContent()

    await page.locator('[aria-label="Mes anterior"]').click()
    await page.waitForTimeout(300)

    const prevText = await monthLabel.textContent()
    expect(prevText).not.toBe(initialText)
  })

  test('Dashboard muestra gastos agrupados por día', async ({ page }) => {
    await addTransaction(page, 'birra 1500')
    await addTransaction(page, 'super 25000')

    // Debería ver group header "Hoy"
    await expect(page.locator('text=Hoy').first()).toBeVisible()
  })

  test('Dashboard muestra badge "· pasado" para mes anterior', async ({ page }) => {
    await addTransaction(page, 'gasto 5000')

    await page.locator('[aria-label="Mes anterior"]').click()
    await page.waitForTimeout(300)

    await expect(page.getByText('· pasado')).toBeVisible()
  })

  test('Dashboard muestra proyección para mes futuro con recurrentes', async ({ page }) => {
    await addTransaction(page, 'alquiler 45000')

    const nextBtn = page.locator('[aria-label="Mes siguiente"]')
    if (await nextBtn.isEnabled()) {
      await nextBtn.click()
      await page.waitForTimeout(500)

      await expect(page.getByText('Modo proyección')).toBeVisible()
    }
  })

  test('Dashboard muestra balance del mes actual', async ({ page }) => {
    await addTransaction(page, 'sueldo 200000')
    await addTransaction(page, 'gasto 50000')

    // BalanceCard muestra Disponible y Gastado
    await expect(page.getByText('Disponible').first()).toBeVisible()
    await expect(page.getByText('Gastado').first()).toBeVisible()
  })
})
