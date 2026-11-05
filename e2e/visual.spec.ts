import { expect, test } from './fixtures.ts'

test.describe('regressão visual', () => {
  test.use({ scenario: 'fast' })

  test.beforeEach(async ({ kurio }) => {
    await kurio.installClock()
    await kurio.reset()
  })

  test('início', async ({ page, kurio, isMobile }) => {
    await kurio.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await kurio.prepareVisualPage()
    await expect(page).toHaveScreenshot(isMobile ? 'inicio-mobile.png' : 'inicio-desktop.png', {
      fullPage: true,
      mask: kurio.visualMasks(),
    })
  })

  test('detalhe do NFT', async ({ page, kurio, isMobile }) => {
    await kurio.goto('/nfts/emerald-ape-042')
    await expect(page.getByRole('heading', { level: 1, name: 'Emerald Ape #042' })).toBeVisible()
    await kurio.prepareVisualPage()
    await expect(page).toHaveScreenshot(isMobile ? 'detalhe-mobile.png' : 'detalhe-desktop.png', {
      fullPage: true,
      mask: kurio.visualMasks(),
    })
  })

  test('carrinho autenticado', async ({ page, kurio, isMobile }) => {
    await kurio.loginAsNova('/carrinho')
    await expect(page.getByRole('heading', { name: /Carrinho/ })).toBeVisible()
    await expect(page.getByRole('article').first()).toBeVisible()
    await kurio.prepareVisualPage()
    await expect(page).toHaveScreenshot(isMobile ? 'carrinho-mobile.png' : 'carrinho-desktop.png', {
      fullPage: true,
      mask: kurio.visualMasks(),
    })
  })

  test('pagamento', async ({ page, kurio, isMobile }) => {
    await kurio.loginAsNova('/pagamento')
    await expect(page.getByRole('heading', { name: 'Pagamento', exact: true })).toBeVisible()

    if (!isMobile) {
      const panel = page.getByRole('region', { name: /carteira/i })
      await expect(panel.getByText('Principal')).toBeVisible({ timeout: 15_000 })
      await panel.getByRole('button', { name: 'Conectar MetaMask' }).click()
      await expect(panel.getByText(/Conectada/)).toBeVisible({ timeout: 10_000 })
      await expect(page.getByRole('complementary', { name: /Resumo do pedido/ })).toContainText('ETH')
    } else {
      await expect(page.getByRole('heading', { name: 'Pagamento com carteira' })).toBeVisible()
    }

    await kurio.prepareVisualPage()
    await expect(page).toHaveScreenshot(isMobile ? 'pagamento-mobile.png' : 'pagamento-desktop.png', {
      fullPage: true,
      mask: kurio.visualMasks(),
    })
  })
})
