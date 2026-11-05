import { expect, test, type Page } from '@playwright/test'

async function loginNova(page: Page, redirect = '/pagamento', scenario = 'fast') {
  await page.goto(`/login?redirect=${encodeURIComponent(redirect)}&scenario=${scenario}`)
  await page.getByPlaceholder('contato@email.com').fill('nova@kurio.dev')
  await page.getByPlaceholder('Senha', { exact: true }).fill('Kurio@123')
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
}

async function clearCheckoutStorage(page: Page) {
  await page.evaluate(() => {
    window.__kurioMock!.reset()
    localStorage.removeItem('kurio:guest-cart')
    localStorage.removeItem('kurio:session-token')
    sessionStorage.removeItem('kurio:cart-coupon')
    sessionStorage.removeItem('kurio:checkout-idempotency')
    sessionStorage.removeItem('kurio:pending-order')
  })
}

async function connectPrimaryWallet(page: Page) {
  const panel = page.getByRole('region', { name: /carteira/i })
  await expect(panel.getByText('Principal')).toBeVisible({ timeout: 15_000 })
  await panel.getByRole('button', { name: 'Conectar MetaMask' }).click()
  await expect(panel.getByText(/Conectada/)).toBeVisible({ timeout: 10_000 })
}

async function confirmAndPay(page: Page) {
  await page.getByRole('button', { name: 'Revisar e pagar' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog.getByText(/Total/)).toBeVisible()
  await dialog.getByRole('button', { name: 'Confirmar e pagar' }).click()
}

test.beforeEach(async ({ page }) => {
  await page.goto('/?scenario=fast')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await clearCheckoutStorage(page)
})

test('compra completa do carrinho ao recibo confirmado', async ({ page, isMobile }) => {
  test.skip(isMobile, 'fluxo completo coberto no desktop; mobile valida carteira')

  await loginNova(page)
  await expect(page.getByRole('heading', { name: 'Pagamento', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Perfil do colecionador' })).toBeVisible()
  await expect(page.getByRole('complementary', { name: /Resumo do pedido/ })).toContainText('26.846')

  await connectPrimaryWallet(page)
  await confirmAndPay(page)

  await expect(page).toHaveURL(/\/pedidos\/ord_/)
  await expect(page.getByRole('heading', { name: 'Pagamento pendente' })).toBeVisible()

  await page.evaluate(() => window.__kurioMock!.settleOrders())
  await expect(page.getByRole('heading', { name: 'Pedido confirmado' })).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText('Ver no Etherscan')).toBeVisible()
  await expect(page.getByText('(link simulado)')).toBeVisible()
  await expect(page.getByText('26.846 ETH').first()).toBeVisible()
})

test('mobile: pagamento com carteira conecta e recusa', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'UI mobile de carteira')

  await loginNova(page)
  await expect(page.getByRole('heading', { name: 'Pagamento com carteira' })).toBeVisible()

  const panel = page.getByRole('region', { name: /carteira/i })
  await panel.getByRole('button', { name: 'Conectar MetaMask' }).click()
  await expect(panel.getByText(/Conectada/)).toBeVisible()
  await panel.getByRole('button', { name: 'Desconectar' }).click()
  await expect(panel.getByRole('button', { name: 'Conectar MetaMask' })).toBeVisible()

  await panel.getByRole('button', { name: /Simular recusa \(MetaMask\)/ }).click()
  await expect(panel.getByText(/recusou a conexão/i)).toBeVisible()
})

test('falha de pagamento, clique repetido e timeout com recuperação', async ({ page, isMobile }) => {
  test.skip(isMobile, 'mesmo fluxo no desktop')
  test.setTimeout(90_000)

  await loginNova(page, '/pagamento', 'payment-declined')
  await expect
    .poll(async () => page.evaluate(() => window.__kurioMock!.getScenario().name))
    .toBe('payment-declined')
  await connectPrimaryWallet(page)
  await confirmAndPay(page)

  await expect(page).toHaveURL(/\/pedidos\/ord_/)
  await page.evaluate(() => window.__kurioMock!.settleOrders())
  await expect(page.getByRole('heading', { name: 'Pedido recusado' })).toBeVisible({ timeout: 10_000 })

  await page.evaluate(() => {
    sessionStorage.removeItem('kurio:pending-order')
    sessionStorage.removeItem('kurio:checkout-idempotency')
    localStorage.removeItem('kurio:session-token')
    window.__kurioMock!.reset()
  })
  await loginNova(page, '/pagamento', 'slow')
  await expect(page.getByRole('heading', { name: 'Pagamento', exact: true })).toBeVisible({ timeout: 15_000 })
  await connectPrimaryWallet(page)

  await page.getByRole('button', { name: 'Revisar e pagar' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()

  await dialog.getByRole('button', { name: 'Confirmar e pagar' }).click()
  await expect(dialog.getByRole('button', { name: 'Enviando…' })).toBeDisabled()
  await expect(page).toHaveURL(/\/pedidos\/ord_/, { timeout: 20_000 })

  await page.evaluate(() => {
    sessionStorage.removeItem('kurio:pending-order')
    sessionStorage.removeItem('kurio:checkout-idempotency')
    localStorage.removeItem('kurio:session-token')
    window.__kurioMock!.reset()
  })
  await loginNova(page, '/pagamento', 'order-timeout')
  await expect
    .poll(async () => page.evaluate(() => window.__kurioMock!.getScenario().name))
    .toBe('order-timeout')
  await connectPrimaryWallet(page)

  const started = Date.now()
  await confirmAndPay(page)
  await expect(page).toHaveURL(/\/pedidos\/ord_/, { timeout: 30_000 })
  // Recuperação após timeout do cliente (>10s no mock) ainda chega ao recibo.
  expect(Date.now() - started).toBeGreaterThan(8_000)
  await expect(page.getByRole('heading', { name: /Pagamento pendente|Pedido confirmado/ })).toBeVisible()
  await expect(page.getByText(/Pedido ord_/)).toBeVisible()
})

test('Socket.IO altera preço durante o checkout e exige nova confirmação', async ({ page, isMobile }) => {
  test.skip(isMobile, 'mesmo fluxo no desktop')

  await loginNova(page)
  const summary = page.getByRole('complementary', { name: /Resumo do pedido/ })
  await expect(summary).toContainText('Emerald Ape #042')
  await expect(summary).toContainText('26.846')
  await expect
    .poll(async () => page.evaluate(() => Boolean(window.__kurioSocket?.connected())))
    .toBe(true)

  await page.evaluate(() =>
    window.__kurioMock!.updateNft('emerald-ape-042', {
      editionId: 'emerald-ape-042--1-50',
      price: '1.50',
    }),
  )

  // Cotação invalida e o resumo reflete o novo preço (2 × 1.50 = 3.00 na linha)
  await expect(summary).toContainText('3.00 ETH', { timeout: 10_000 })
  await expect(summary).not.toContainText('26.846')

  await page.evaluate(() => {
    sessionStorage.removeItem('kurio:checkout-idempotency')
    sessionStorage.removeItem('kurio:pending-order')
    window.__kurioMock!.setScenario('price-change')
  })
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Pagamento', exact: true })).toBeVisible()
  await connectPrimaryWallet(page)

  await page.getByRole('button', { name: 'Revisar e pagar' }).click()
  const review = page.getByRole('dialog')
  await expect(review).toBeVisible()
  await review.getByRole('button', { name: 'Confirmar e pagar' }).click()

  await expect(page.getByRole('dialog').getByRole('heading', { name: 'Preço atualizado' })).toBeVisible({
    timeout: 10_000,
  })
  await expect(page.getByRole('dialog')).toContainText(/Total/)
  await page.getByRole('dialog').getByRole('button', { name: 'Confirmar e pagar' }).click()
  await expect(page).toHaveURL(/\/pedidos\/ord_/)
})
