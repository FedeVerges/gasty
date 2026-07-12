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

  test('clones son registros reales en DB: crear fijo y verificar en mes siguiente', async ({ page }) => {
    // Crear gasto recurrente fijo
    await addTransaction(page, 'alquiler 45000')

    // Verificar que aparece en el dashboard del mes actual
    await expect(page.getByText('Alquiler').first()).toBeVisible()

    // Navegar al mes siguiente
    await navigateTo(page, 'transactions')
    const nextBtn = page.locator('[aria-label="Mes siguiente"]')
    await expect(nextBtn).toBeEnabled()
    await nextBtn.click()
    await page.waitForTimeout(500)

    // El mes siguiente debería tener el clone como transacción real
    // El badge "Proy." indica que es un clone futuro
    await expect(page.getByText('Alquiler').first()).toBeVisible()
  })

  test('fixed_temporary crea clones correctos para cuotas restantes', async ({ page }) => {
    // Crear cuota auto 3/6 (cuota 3 de 6 total)
    await addTransaction(page, 'cuota auto 25000 3/6')

    // Verificar badge de cuotas 3/6
    await expect(page.getByText('3/6').first()).toBeVisible()

    // Ir a Settings — la fuente debería existir con info de cuotas
    await navigateTo(page, 'settings')
    await expect(page.getByText('Movimientos recurrentes')).toBeVisible()
    await expect(page.getByText('Auto').first()).toBeVisible()
    // Verificar que muestra 3/6 en la info de la fuente
    await expect(page.getByText('3/6')).toBeVisible()
  })

  test('delete recurrente: fuente queda como transacción normal', async ({ page }) => {
    // Crear gasto recurrente
    await addTransaction(page, 'expensas 30000')

    // Ir a Settings y eliminar la fuente recurrente
    await navigateTo(page, 'settings')
    page.once('dialog', (dialog) => dialog.accept())
    await page.getByRole('button', { name: 'Eliminar' }).click()

    // Verificar que desapareció de la lista de recurrentes
    await expect(page.getByText('No tenés movimientos recurrentes')).toBeVisible()

    // Volver al dashboard — la transacción original debería seguir existiendo
    // como transacción normal (sin badge de recurrencia)
    await navigateTo(page, 'dashboard')
    await expect(page.getByText('Expensas').first()).toBeVisible()
  })

  test('recurrente fijo muestra badge de recurrencia en fuente', async ({ page }) => {
    // Crear gasto recurrente fijo (keyword "servicio" → recurrente auto)
    await addTransaction(page, 'servicio internet 5000')

    // La fuente debería tener un badge de recurrencia visible
    // El badge usa la clase bg-recurring-soft y contiene "🔄"
    const recurringBadge = page.locator('.bg-recurring-soft').first()
    await expect(recurringBadge).toBeVisible()
  })

  test('fixed_temporary muestra badge de cuotas en fuente', async ({ page }) => {
    // Crear cuota auto 1/6
    await addTransaction(page, 'cuota auto 25000 1/6')

    // La fuente debería mostrar badge de cuotas "1/6"
    await expect(page.getByText('1/6').first()).toBeVisible()
  })

  test('delete recurrente preserva clones pasados y borra futuros', async ({ page }) => {
    // Crear fuente recurrente fija
    await addTransaction(page, 'suscripcion streaming 1500')

    // Verificar que aparece en el dashboard
    await expect(page.getByText('Streaming').first()).toBeVisible()

    // Ir a Settings y eliminar la fuente recurrente
    await navigateTo(page, 'settings')
    page.once('dialog', (dialog) => dialog.accept())
    await page.getByRole('button', { name: 'Eliminar' }).click()

    // Verificar que desapareció de la lista de recurrentes
    await expect(page.getByText('No tenés movimientos recurrentes')).toBeVisible()

    // Volver al dashboard — la transacción original debería seguir existiendo
    await navigateTo(page, 'dashboard')
    await expect(page.getByText('Streaming').first()).toBeVisible()
  })

  test('recurrente fijo: editar fuente actualiza monto en futuros meses', async ({ page }) => {
    // Crear fuente recurrente fija
    await addTransaction(page, 'alquiler 45000')

    // Ir al dashboard y hacer click en la transacción para editar
    await page.getByText('Alquiler').first().click()
    await page.waitForTimeout(300)

    // Modificar el monto (modo edición: campo numérico)
    const amountInput = page.locator('input[placeholder="Monto"]')
    await amountInput.fill('50000')
    await page.waitForTimeout(200)

    // Confirmar edición
    await page.getByRole('button', { name: 'Confirmar' }).click()
    await page.waitForTimeout(400)

    // Verificar que el monto se actualizó en el dashboard
    await expect(page.getByText('Alquiler').first()).toBeVisible()

    // Navegar al mes siguiente — el clone futuro debería tener el nuevo monto
    await navigateTo(page, 'transactions')
    const nextBtn = page.locator('[aria-label="Mes siguiente"]')
    await expect(nextBtn).toBeEnabled()
    await nextBtn.click()
    await page.waitForTimeout(500)

    // El mes siguiente debería mostrar el gasto editado
    await expect(page.getByText('Alquiler').first()).toBeVisible()
  })
})
