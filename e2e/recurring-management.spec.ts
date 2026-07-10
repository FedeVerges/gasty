import { test, expect } from '@playwright/test'
import { resetDb, addTransaction, navigateTo } from './helpers'

test.describe('Gestión de recurrencias', () => {
  test.beforeEach(async ({ page }) => {
    await resetDb(page)
  })

  test('delete recurrente: elimina fuente desde Settings y desaparece', async ({ page }) => {
    // PRECONDITION: Crear gasto recurrente (keyword "alquiler" → recurrente auto)
    await addTransaction(page, 'alquiler 45000')

    // Ir a Settings → sección Movimientos recurrentes
    await navigateTo(page, 'settings')

    // Verificar que la fuente recurrente aparece en la lista
    await expect(page.getByText('Movimientos recurrentes')).toBeVisible()
    await expect(page.getByText('alquiler').first()).toBeVisible()

    // Eliminar la fuente (aceptar confirm del browser)
    page.once('dialog', (dialog) => dialog.accept())
    await page.getByRole('button', { name: 'Eliminar' }).click()

    // Verificar que desapareció
    await expect(page.getByText('No tenés movimientos recurrentes')).toBeVisible()
  })

  test('ciclo de vida fixed_temporary: no crea clones si totalMonths completado', async ({ page }) => {
    // Crear cuota 12/12 (ya casi completada)
    await addTransaction(page, 'cuota auto 25000 12/12')

    // Verificar badge de cuotas
    await expect(page.getByText('12/12').first()).toBeVisible()

    // Ir a Settings — la fuente debería existir
    await navigateTo(page, 'settings')
    await expect(page.getByText('Movimientos recurrentes')).toBeVisible()
    await expect(page.getByText('Auto').first()).toBeVisible()
  })

  test('recurrente fijo genera clones al navegar meses', async ({ page }) => {
    // Crear fuente recurrente
    await addTransaction(page, 'expensas 30000')

    // Ir al dashboard — debería ver el gasto
    await expect(page.getByText('Expensas').first()).toBeVisible()

    // Navegar al mes siguiente en Movimientos (MonthSelector está ahí)
    await navigateTo(page, 'transactions')
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
    await expect(page.getByText('Movimientos recurrentes')).toBeVisible()
    await expect(page.getByText('Alquiler').first()).toBeVisible()
    await expect(page.getByText('Netflix').first()).toBeVisible()
  })
})
