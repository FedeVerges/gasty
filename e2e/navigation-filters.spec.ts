import { test, expect } from '@playwright/test'
import { resetDb, addTransaction, navigateTo } from './helpers'

test.describe('Navegación y filtros', () => {
  test.beforeEach(async ({ page }) => {
    await resetDb(page)
  })

  test('MonthSelector navega entre meses en Movimientos', async ({ page }) => {
    await addTransaction(page, 'gasto hoy 5000')

    await navigateTo(page, 'transactions')
    const monthLabel = page.locator('.text-base.font-bold').first()
    const initialText = await monthLabel.textContent()

    // Ir al mes anterior
    await page.locator('[aria-label="Mes anterior"]').click()
    await page.waitForTimeout(300)

    const prevText = await monthLabel.textContent()
    expect(prevText).not.toBe(initialText)

    // Volver al mes actual
    await page.locator('[aria-label="Mes siguiente"]').click()
    await page.waitForTimeout(300)

    const backText = await monthLabel.textContent()
    expect(backText).toBe(initialText)
  })

  test('MonthSelector muestra "· pasado" para meses anteriores', async ({ page }) => {
    await addTransaction(page, 'gasto 5000')

    await navigateTo(page, 'transactions')
    await page.locator('[aria-label="Mes anterior"]').click()
    await page.waitForTimeout(300)

    await expect(page.getByText('· pasado')).toBeVisible()
  })

  test('MonthSelector muestra "Proy." para meses futuros', async ({ page }) => {
    await addTransaction(page, 'alquiler 45000')

    await navigateTo(page, 'transactions')
    const nextBtn = page.locator('[aria-label="Mes siguiente"]')
    if (await nextBtn.isEnabled()) {
      await nextBtn.click()
      await page.waitForTimeout(500)

      await expect(page.getByText('Proy.')).toBeVisible()
    }
  })

  test('búsqueda por descripción filtra transacciones', async ({ page }) => {
    await addTransaction(page, 'birra 1500')

    await navigateTo(page, 'transactions')
    await page.getByPlaceholder('Buscar por descripción, categoría o monto...').fill('birra')
    await page.waitForTimeout(300)

    await expect(page.getByText('birra').first()).toBeVisible()
  })

  test('búsqueda por monto exacto filtra transacciones', async ({ page }) => {
    await addTransaction(page, 'birra 1500')

    await navigateTo(page, 'transactions')
    await page.getByPlaceholder('Buscar por descripción, categoría o monto...').fill('1500')
    await page.waitForTimeout(300)

    await expect(page.getByText('birra').first()).toBeVisible()
  })

  test('Movimientos muestra group headers por día', async ({ page }) => {
    await addTransaction(page, 'cafe 800')
    await addTransaction(page, 'birra 1500')

    await navigateTo(page, 'transactions')

    // Debería ver al menos un group header con "Hoy"
    await expect(page.locator('text=Hoy').first()).toBeVisible()
  })

  test('Movimientos muestra balance del mes', async ({ page }) => {
    await addTransaction(page, 'sueldo 200000')
    await addTransaction(page, 'gasto 50000')

    await navigateTo(page, 'transactions')

    await expect(page.getByText('Balance').first()).toBeVisible()
  })

  test('Dashboard muestra empty state cuando no hay transacciones', async ({ page }) => {
    await expect(page.getByText('Sin movimientos')).toBeVisible()
    await expect(page.getByText('Tocá el botón + para registrar uno')).toBeVisible()
  })

  test('bottom nav cambia entre tabs correctamente', async ({ page }) => {
    await page.getByRole('button', { name: 'Inicio' }).click()
    await page.waitForTimeout(200)
    await expect(page.getByText('Gasty')).toBeVisible()

    await page.getByRole('button', { name: 'Movimientos' }).click()
    await page.waitForTimeout(200)
    await expect(page.getByText('Movimientos').first()).toBeVisible()

    await page.getByRole('button', { name: 'Stats' }).click()
    await page.waitForTimeout(200)
    await expect(page.getByText('Stats').first()).toBeVisible()

    await page.getByRole('button', { name: 'Ajustes' }).click()
    await page.waitForTimeout(200)
    await expect(page.getByText('Ajustes').first()).toBeVisible()
  })
})
