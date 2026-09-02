import { expect, test } from '@playwright/test'
import { addTransaction, resetDb } from './helpers'

test.describe('Perfiles', () => {
  test.beforeEach(async ({ page }) => {
    await resetDb(page)
  })

  test('crea, cambia y elimina perfiles sin mezclar movimientos', async ({ page }) => {
    await page.getByRole('button', { name: /Perfil actual Personal/ }).click()
    await page.getByRole('button', { name: 'Administrar perfiles' }).click()
    await expect(page.getByRole('heading', { name: 'Perfiles' })).toBeVisible()

    await page.getByRole('button', { name: '+ Agregar perfil' }).click()
    await page.getByPlaceholder('Nombre del perfil').fill('Negocio')
    await page.getByRole('button', { name: 'Crear perfil' }).click()
    await expect(page.getByRole('button', { name: /Perfil actual Negocio/ })).toBeVisible()

    await page.getByRole('button', { name: 'Inicio', exact: true }).click()
    await addTransaction(page, 'insumos 25000')
    await expect(page.getByText('Insumos').first()).toBeVisible()

    await page.getByRole('button', { name: /Perfil actual Negocio/ }).click()
    await page.getByRole('option', { name: 'Personal' }).click()
    await expect(page.getByRole('button', { name: /Perfil actual Personal/ })).toBeVisible()
    await expect(page.getByText('Insumos')).not.toBeVisible()

    await page.getByRole('button', { name: /Perfil actual Personal/ }).click()
    await page.getByRole('button', { name: 'Administrar perfiles' }).click()
    page.once('dialog', (dialog) => dialog.accept())
    await page.getByRole('button', { name: 'Eliminar Negocio' }).click()
    await expect(page.getByText('Negocio')).not.toBeVisible()
  })
})
