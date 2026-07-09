import { test, expect } from '@playwright/test'
import { resetDb, navigateTo } from './helpers'

test.describe('CategoryManager', () => {
  test.beforeEach(async ({ page }) => {
    await resetDb(page)
  })

  async function openCategoryManager(page: import('@playwright/test').Page) {
    await navigateTo(page, 'settings')
    await page.getByRole('button', { name: 'Editar' }).click()
    await page.waitForTimeout(300)
    await expect(page.getByText('Categorías y palabras clave')).toBeVisible()
  }

  test('crea una categoría nueva', async ({ page }) => {
    await openCategoryManager(page)

    await page.getByRole('button', { name: '+ Agregar categoría' }).click()
    await page.waitForTimeout(200)

    await page.getByPlaceholder('Nombre de la categoría').fill('Gimnasio')
    await page.getByRole('button', { name: 'Agregar', exact: true }).click()
    await page.waitForTimeout(300)

    await expect(page.getByText('Gimnasio').first()).toBeVisible()
  })

  test('agrega y quita keywords a una categoría', async ({ page }) => {
    await openCategoryManager(page)

    // Expandir categoría "Comida"
    await page.getByText('Comida').first().click()
    await page.waitForTimeout(200)

    // Agregar keyword
    await page.getByPlaceholder('nueva palabra clave...').fill('protein')
    // Use the + button inside the keyword input area (not the FAB)
    await page.locator('input[placeholder="nueva palabra clave..."]').press('Enter')
    await page.waitForTimeout(300)

    await expect(page.getByText('protein').first()).toBeVisible()

    // Quitar keyword
    await page.getByLabel('Eliminar protein').click()
    await page.waitForTimeout(300)

    await expect(page.getByText('protein')).not.toBeVisible()
  })

  test('categorías default no muestran botón eliminar', async ({ page }) => {
    await openCategoryManager(page)

    // Expandir "Comida" (es default)
    await page.getByText('Comida').first().click()
    await page.waitForTimeout(200)

    // No debería haber botón de eliminar categoría
    await expect(page.getByText('Eliminar categoría')).not.toBeVisible()
  })
})
