import { test, expect } from '@playwright/test'
import { resetDb, addTransaction } from './helpers'

test.describe('Editar y eliminar transacciones', () => {
  test.beforeEach(async ({ page }) => {
    await resetDb(page)
  })

  test('edita una transacción y persiste el cambio', async ({ page }) => {
    await addTransaction(page, 'prueba 5000')

    await page.getByText('prueba').last().click()
    await page.waitForTimeout(300)

    // Modo edición: campos individuales (descripción + monto), sin placeholders
    const descInput = page.getByLabel('Descripción')
    await descInput.fill('prueba editada 5000')
    const amountInput = page.locator('input[type="number"]')
    await amountInput.fill('5000')
    await page.waitForTimeout(200)

    await page.getByRole('button', { name: 'Confirmar edición' }).click()
    await page.waitForTimeout(300)

    await expect(page.getByText('prueba editada').first()).toBeVisible()
  })

  test('elimina una transacción y desaparece de la lista', async ({ page }) => {
    await addTransaction(page, 'temporal 9999')

    page.once('dialog', (dialog) => {
      dialog.accept()
    })

    const deleteBtn = page.locator('[aria-label="Eliminar transacción"]')
    await deleteBtn.click()
    await page.waitForTimeout(500)

    await expect(page.getByText('temporal')).not.toBeVisible()
  })
})
