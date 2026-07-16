import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'

export async function resetDb(page: Page) {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(500)

  await page.evaluate(async () => {
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.deleteDatabase('gasty')
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
    })
  })

  await page.reload()
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(500)
}

export async function navigateTo(page: Page, tab: string) {
  const tabLabel = (
    {
      dashboard: 'Inicio',
      transactions: 'Movimientos',
      stats: 'Stats',
      settings: 'Ajustes',
    } satisfies Record<string, string>
  )[tab]

  if (!tabLabel) throw new Error(`Unknown tab: ${tab}`)

  await page.getByRole('button', { name: tabLabel, exact: true }).click()
  await page.waitForTimeout(300)
}

export async function addTransaction(page: Page, text: string) {
  await page.locator('[aria-label="Agregar transacción"]').click()
  await page.waitForTimeout(300)
  // TODO: change locator with another property, because placeholder can change in the future. Try some testId or aria-label, or something else that is more stable and less likely to change.  
  const input = page.locator('input[placeholder="Ej: birra 1500"]')
  await input.fill(text)
  await page.waitForTimeout(200)

  await page.getByRole('button', { name: 'Confirmar' }).click()
  await page.waitForTimeout(400)
}

export function formatMoneyARS(amount: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

export async function expectToSeeTransaction(
  page: Page,
  description: string,
) {
  await expect(page.getByText(description).first()).toBeVisible()
}
