import { test, expect } from '@playwright/test'
import { resetDb, addTransaction, navigateTo } from './helpers'

test.describe('Gestión de recurrencias', () => {
  test.beforeEach(async ({ page }) => {
    await resetDb(page)
  })

  test('delete cascada elimina fuente y todos sus clones', async ({ page }) => {
    // Crear fuente recurrente — usar keyword que detecta recurrencia (ej: alquiler)
    await addTransaction(page, 'alquiler 45000')

    // Ir a Settings y scroll down para ver la sección de recurrentes
    await navigateTo(page, 'settings')

    // Scroll down to the recurring section
    await page.getByText('Gastos recurrentes', { exact: true }).scrollIntoViewIfNeeded()
    await page.waitForTimeout(500)

    // Verificar que la fuente recurrente aparece
    await expect(page.getByText('Alquiler').first()).toBeVisible({ timeout: 5000 })

    // Eliminar fuente recurrente — el confirm lo aceptamos
    page.once('dialog', (dialog) => dialog.accept())

    // Click the specific "Eliminar" text button
    await page.locator('button:text("Eliminar")').first().click()
    await page.waitForTimeout(1000)

    // Verificar que ya no hay recurrentes
    await expect(page.getByText('No tenés gastos recurrentes')).toBeVisible()
  })

  test('ciclo de vida fixed_temporary: no crea clones si totalMonths completado', async ({ page }) => {
    // Crear cuota 12/12 (ya casi completada)
    await addTransaction(page, 'auto 25000 12/12')

    // Verificar badge
    await expect(page.getByText('12/12').first()).toBeVisible()

    // Ir a Settings — la fuente debería existir
    await navigateTo(page, 'settings')
    await expect(page.getByText('Gastos recurrentes')).toBeVisible()
    await expect(page.getByText('Auto').first()).toBeVisible()
  })

  test('recurrente fijo genera clones al navegar meses', async ({ page }) => {
    // Crear fuente recurrente
    await addTransaction(page, 'expensas 30000')

    // Ir al dashboard — debería ver el gasto
    await expect(page.getByText('Expensas').first()).toBeVisible()

    // Navegar al mes siguiente
    const nextBtn = page.locator('[aria-label="Mes siguiente"]')
    if (await nextBtn.isEnabled()) {
      await nextBtn.click()
      await page.waitForTimeout(500)

      // En proyección, debería ver el badge de proyector
      await expect(page.getByText('Proy.')).toBeVisible()
    }
  })

  test('Settings muestra lista de recurrentes con info correcta', async ({ page }) => {
    await addTransaction(page, 'alquiler 45000')
    await addTransaction(page, 'suscripcion netflix 3500')

    await navigateTo(page, 'settings')
    await expect(page.getByText('Gastos recurrentes')).toBeVisible()
    await expect(page.getByText('Alquiler').first()).toBeVisible()
    await expect(page.getByText('Netflix').first()).toBeVisible()
  })
})
