import { expect, test, type Page } from '@playwright/test'

const API = 'https://api.mktnft.mock'

const COLLECTOR = {
  displayName: 'Nova Sato',
  username: 'novasato',
  profileName: 'novasato',
  email: 'nova@kurio.dev',
  referralCode: 'KURIO-NOVA',
  ensName: 'novasato',
}

async function api(
  page: Page,
  method: string,
  path: string,
  options: { body?: unknown; token?: string; headers?: Record<string, string> } = {},
) {
  return page.evaluate(
    async ({ url, method, body, token, headers }) => {
      try {
        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...headers,
          },
          body: body === undefined ? undefined : JSON.stringify(body),
        })
        const text = await response.text()
        return { status: response.status, body: text ? JSON.parse(text) : null }
      } catch (error) {
        return { status: 0, body: null, networkError: String(error) }
      }
    },
    { url: `${API}${path}`, method, body: options.body, token: options.token, headers: options.headers },
  )
}

async function loginToken(page: Page, email = 'nova@kurio.dev', password = 'Kurio@123') {
  const result = await api(page, 'POST', '/auth/login', { body: { email, password } })
  expect(result.status).toBe(200)
  return result.body.token as string
}

async function createPendingOrder(page: Page, token: string, key = `e2e-${crypto.randomUUID()}`) {
  const cart = await api(page, 'GET', '/cart', { token })
  const items = cart.body.items.map(({ nftId, editionId, quantity }: { nftId: string; editionId: string; quantity: number }) => ({
    nftId,
    editionId,
    quantity,
  }))
  const quote = await api(page, 'POST', '/quote', { token, body: { items, network: 'ethereum' } })
  expect(quote.status).toBe(200)
  const order = await api(page, 'POST', '/orders', {
    token,
    headers: { 'Idempotency-Key': key },
    body: {
      quoteId: quote.body.id,
      items,
      network: 'ethereum',
      walletId: 'wal_nova_primary',
      collector: COLLECTOR,
    },
  })
  expect([200, 201]).toContain(order.status)
  return order.body
}

test.beforeEach(async ({ page }) => {
  await page.goto('/?scenario=fast')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await page.evaluate(() => {
    window.__kurioMock!.reset()
    localStorage.removeItem('kurio:guest-cart')
    localStorage.removeItem('kurio:session-token')
    sessionStorage.removeItem('kurio:cart-coupon')
    sessionStorage.removeItem('kurio:checkout-idempotency')
    sessionStorage.removeItem('kurio:pending-order')
  })
})

test('recibo confirmado: snapshot, transação simulada e imutabilidade', async ({ page, isMobile }) => {
  test.skip(isMobile, 'mesmo fluxo no desktop')

  const token = await loginToken(page)
  await page.evaluate((t) => localStorage.setItem('kurio:session-token', t), token)

  const pending = await createPendingOrder(page, token)
  await page.goto(`/pedidos/${pending.id}?scenario=fast`)
  await expect(page.getByRole('heading', { name: 'Pagamento pendente' })).toBeVisible()
  await expect(page.getByText(/Aguardando confirmação/)).toBeVisible()

  await page.evaluate(() => window.__kurioMock!.settleOrders())
  await expect(page.getByRole('heading', { name: 'Pedido confirmado' })).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText('Ver no Etherscan')).toBeVisible()
  await expect(page.getByText('(link simulado)')).toBeVisible()
  await expect(page.getByText(/0x[a-f0-9]/i).first()).toBeVisible()
  await expect(page.getByText('Emerald Ape #042')).toBeVisible()
  await expect(page.getByText('26.846 ETH').first()).toBeVisible()

  await page.evaluate(() =>
    window.__kurioMock!.updateNft('emerald-ape-042', {
      editionId: 'emerald-ape-042--1-50',
      price: '9.99',
    }),
  )
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Pedido confirmado' })).toBeVisible()
  await expect(page.getByText('26.846 ETH').first()).toBeVisible()
  await expect(page.getByText('9.99 ETH')).toHaveCount(0)
})

test('pedido recusado e 404 para outro usuário', async ({ page, isMobile }) => {
  test.skip(isMobile, 'mesmo fluxo no desktop')

  await page.evaluate(() => window.__kurioMock!.setScenario('payment-declined'))
  const token = await loginToken(page)
  await page.evaluate((t) => localStorage.setItem('kurio:session-token', t), token)

  const pending = await createPendingOrder(page, token, 'declined-receipt')
  await page.goto(`/pedidos/${pending.id}?scenario=payment-declined`)
  await expect(page.getByRole('heading', { name: 'Pagamento pendente' })).toBeVisible()
  await expect
    .poll(async () => page.evaluate(() => Boolean(window.__kurioMock)))
    .toBe(true)
  await page.evaluate(() => window.__kurioMock!.settleOrders())
  await expect(page.getByRole('heading', { name: 'Pedido recusado' })).toBeVisible({ timeout: 10_000 })
  await expect(page.getByRole('alert').filter({ hasText: /recusou/i })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Voltar ao carrinho' })).toBeVisible()

  await page.evaluate(() => {
    localStorage.removeItem('kurio:session-token')
  })
  const leo = await loginToken(page, 'leo@kurio.dev', 'Kurio@456')
  await page.evaluate((t) => localStorage.setItem('kurio:session-token', t), leo)
  await page.goto(`/pedidos/${pending.id}`)
  await expect(page.getByRole('heading', { name: 'Pedido não encontrado' })).toBeVisible()
})

test('refresh retoma pedido pendente sem criar outro', async ({ page, isMobile }) => {
  test.skip(isMobile, 'mesmo fluxo no desktop')

  const token = await loginToken(page)
  await page.evaluate((t) => localStorage.setItem('kurio:session-token', t), token)
  const pending = await createPendingOrder(page, token, 'pending-refresh')

  await page.goto(`/pedidos/${pending.id}?scenario=fast`)
  await expect(page.getByRole('heading', { name: 'Pagamento pendente' })).toBeVisible()
  await page.evaluate((id) => sessionStorage.setItem('kurio:pending-order', id), pending.id)

  await page.reload()
  await expect(page).toHaveURL(new RegExp(`/pedidos/${pending.id}`))
  await expect(page.getByRole('heading', { name: 'Pagamento pendente' })).toBeVisible()

  const list = await api(page, 'GET', '/orders', { token })
  expect(list.body.items.filter((o: { status: string }) => o.status === 'pending')).toHaveLength(1)
})

test('mobile: recibo confirmado adaptado', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'layout mobile')

  const token = await loginToken(page)
  await page.evaluate((t) => localStorage.setItem('kurio:session-token', t), token)
  const pending = await createPendingOrder(page, token, 'mobile-receipt')
  await page.evaluate(() => window.__kurioMock!.settleOrders())

  await page.goto(`/pedidos/${pending.id}?scenario=fast`)
  await expect(page.getByRole('heading', { name: 'Pedido confirmado' })).toBeVisible({ timeout: 10_000 })
  await expect(page.getByRole('link', { name: 'Voltar ao início' })).toBeVisible()
  await expect(page.getByText('Ver no Etherscan')).toBeVisible()
  await expect(page.getByText('26.846 ETH').first()).toBeVisible()
})
