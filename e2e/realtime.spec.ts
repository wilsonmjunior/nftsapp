import { expect, test, type Page } from '@playwright/test'

async function loginNova(page: Page, redirect = '/carrinho') {
  await page.goto(`/login?redirect=${encodeURIComponent(redirect)}&scenario=fast`)
  await page.getByPlaceholder('contato@email.com').fill('nova@kurio.dev')
  await page.getByPlaceholder('Senha', { exact: true }).fill('Kurio@123')
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
}

async function waitForSocket(page: Page) {
  await expect
    .poll(async () => page.evaluate(() => Boolean(window.__kurioSocket?.connected())))
    .toBe(true)
}

test.beforeEach(async ({ page }) => {
  await page.goto('/?scenario=fast')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await page.evaluate(() => {
    window.__kurioMock!.reset()
    localStorage.removeItem('kurio:guest-cart')
    localStorage.removeItem('kurio:session-token')
    sessionStorage.removeItem('kurio:cart-coupon')
  })
})

test('nft.updated via Socket.IO atualiza carrinho e anuncia mudança de preço', async ({ page, isMobile }) => {
  test.skip(isMobile, 'mesmo fluxo no desktop')

  await loginNova(page)
  await expect(page.getByRole('heading', { name: /Carrinho/ })).toBeVisible()
  await waitForSocket(page)
  await expect.poll(async () => page.evaluate(() => window.__kurioMock!.socketClients())).toBeGreaterThan(0)

  const emerald = page.getByRole('article', { name: /Emerald Ape #042/ })
  await expect(emerald.getByText('1.19 ETH').locator('visible=true')).toBeVisible()

  await page.evaluate(() =>
    window.__kurioMock!.updateNft('emerald-ape-042', {
      editionId: 'emerald-ape-042--1-50',
      price: '1.45',
    }),
  )

  await expect
    .poll(async () => page.evaluate(() => window.__kurioMock!.lastBroadcast()?.type))
    .toBe('nft.updated')

  // Preço da linha e do resumo atualizam via socket → cache/invalidate REST.
  await expect(emerald.getByText('1.45 ETH').locator('visible=true')).toBeVisible({ timeout: 10_000 })
  await expect(page.getByRole('complementary', { name: /Resumo da carteira/ })).not.toContainText('26.83 ETH')
  await expect(page.getByRole('status').filter({ hasText: /1\.45 ETH|NFT atualizado/ })).toBeVisible()
})

test('eventos duplicados e antigos são ignorados; desconexão e reconexão reconciliam', async ({ page, isMobile }) => {
  test.skip(isMobile, 'mesmo fluxo no desktop')

  await loginNova(page, '/nfts/emerald-ape-042')
  await expect(page.getByRole('heading', { level: 1, name: 'Emerald Ape #042' })).toBeVisible()
  await waitForSocket(page)

  await page.evaluate(() =>
    window.__kurioMock!.updateNft('emerald-ape-042', {
      editionId: 'emerald-ape-042--1-50',
      price: '1.33',
    }),
  )
  await expect(page.getByText('1.33 ETH').first()).toBeVisible()

  await page.evaluate(() => window.__kurioMock!.rebroadcastNft('emerald-ape-042'))
  await expect(page.getByText('1.33 ETH').first()).toBeVisible()

  await page.evaluate(() => window.__kurioMock!.rebroadcastStaleNft('emerald-ape-042', 1))
  await expect(page.getByText('1.33 ETH').first()).toBeVisible()
  await expect(page.getByText('1.19 ETH')).toHaveCount(0)

  await page.evaluate(() => window.__kurioSocket!.disconnect())
  await expect.poll(async () => page.evaluate(() => window.__kurioSocket!.connected())).toBe(false)

  await page.evaluate(() =>
    window.__kurioMock!.updateNft('emerald-ape-042', {
      editionId: 'emerald-ape-042--1-50',
      price: '1.55',
    }),
  )

  await page.evaluate(() => window.__kurioSocket!.reconnect())
  await waitForSocket(page)
  await expect(page.getByText(/Conexão em tempo real restabelecida|Reconectado/)).toBeVisible()
  await expect(page.getByText('1.55 ETH').first()).toBeVisible()
})

test('socket conecta após login e desconecta no logout', async ({ page, isMobile }) => {
  test.skip(isMobile, 'mesmo fluxo no desktop')

  await page.goto('/?scenario=fast')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect.poll(async () => page.evaluate(() => window.__kurioSocket!.connected())).toBe(false)

  await loginNova(page, '/')
  await expect(page.getByRole('button', { name: /Conta de Nova Sato/ })).toBeVisible()
  await waitForSocket(page)

  await page.getByRole('button', { name: /Conta de Nova Sato/ }).click()
  await page.getByRole('menuitem', { name: 'Sair' }).click()
  await expect.poll(async () => page.evaluate(() => window.__kurioSocket!.connected())).toBe(false)
})
