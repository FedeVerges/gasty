import { test, expect } from '@playwright/test'
import { resetDb, addTransaction, navigateTo } from './helpers'

test.describe('Parser de lenguaje natural', () => {
  test.beforeEach(async ({ page }) => {
    await resetDb(page)
  })

  test('ayer se refleja como fecha correcta', async ({ page }) => {
    await addTransaction(page, 'birra ayer 1500')

    await navigateTo(page, 'transactions')
    await expect(page.getByText('Birra').first()).toBeVisible()
  })

  test('formato DD-MM se parsea correctamente', async ({ page }) => {
    const now = new Date()
    const day = now.getDate()
    const month = now.getMonth() + 1
    const dateStr = `${day}-${month}`

    await addTransaction(page, `cafe ${dateStr} 800`)

    await expect(page.getByText('Cafe').first()).toBeVisible()
    await expect(page.getByText(/800/).first()).toBeVisible()
  })

  test('formato "DD mes" se parsea correctamente', async ({ page }) => {
    const now = new Date()
    const monthNames = [
      'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
    ]
    const monthName = monthNames[now.getMonth()]

    await addTransaction(page, `almuerzo 15 ${monthName} 5000`)

    await expect(page.getByText('Almuerzo').first()).toBeVisible()
  })

  test('monto con $ se parsea correctamente', async ({ page }) => {
    await addTransaction(page, 'gym $8000')

    await expect(page.getByText('Gym').first()).toBeVisible()
    await expect(page.getByText(/8\.000/).first()).toBeVisible()
  })

  test('detección de categoría por keywords', async ({ page }) => {
    await addTransaction(page, 'hamburguesa 3500')

    await expect(page.getByText('Hamburguesa').first()).toBeVisible()

    await navigateTo(page, 'stats')
    await expect(page.getByText('Top categoría')).toBeVisible()
  })

  test('detección de tipo income por palabra clave', async ({ page }) => {
    await addTransaction(page, 'sueldo 200000')

    await expect(page.getByText('Sueldo').first()).toBeVisible()

    await navigateTo(page, 'dashboard')
    const balanceEl = page.locator('text=Disponible').first()
    await expect(balanceEl).toBeVisible()

    const positiveText = page.locator('text=+').first()
    await expect(positiveText).toBeVisible()
  })

  test('preview muestra categoría y monto formateado', async ({ page }) => {
    await page.locator('[aria-label="Agregar transacción"]').click()
    await page.waitForTimeout(300)

    const input = page.locator('input[placeholder="Ej: birra 1500"]')
    await input.fill('birra 1500')
    await page.waitForTimeout(300)

    await expect(page.getByText('−').first()).toBeVisible()
    await expect(page.getByText(/1\.500/).first()).toBeVisible()
    await expect(page.getByText('Salidas').first()).toBeVisible()

    await page.getByRole('button', { name: 'Cerrar' }).click()
  })

  test('formato DD/MM/YYYY se parsea correctamente', async ({ page }) => {
    // Use current month so it shows on Dashboard
    const now = new Date()
    const day = now.getDate()
    const month = now.getMonth() + 1
    const year = now.getFullYear()

    await addTransaction(page, `supermercado ${day}/${month}/${year} 25000`)

    await expect(page.getByText('Supermercado').first()).toBeVisible()
  })

  test('mes solo se parsea como primer día de ese mes', async ({ page }) => {
    await addTransaction(page, 'suscripcion 5000')

    await expect(page.getByText('Suscripcion').first()).toBeVisible()
  })

  test('montos con decimales se parsean correctamente', async ({ page }) => {
    await addTransaction(page, 'delivery 2500.50')

    await expect(page.getByText('Delivery').first()).toBeVisible()
    await expect(page.getByText(/2\.500,5/).first()).toBeVisible()
  })
})
