import { expect, test, type Page } from '@playwright/test'

const API = 'https://api.mktnft.mock'

type ApiResult = { status: number; body: any; networkError?: string }

async function api(
  page: Page,
  method: string,
  path: string,
  options: { body?: unknown; token?: string; headers?: Record<string, string> } = {},
): Promise<ApiResult> {
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
    { url: `${API}${path}`, method, body: options.body, token: options.token, headers: options.headers ?? {} },
  )
}

async function login(page: Page, email = 'nova@kurio.dev', password = 'Kurio@123') {
  const result = await api(page, 'POST', '/auth/login', { body: { email, password } })
  expect(result.status).toBe(200)
  return result.body.token as string
}

async function setScenario(page: Page, name: string) {
  await page.evaluate((scenario) => window.__kurioMock!.setScenario(scenario as never), name)
}

const COLLECTOR = {
  displayName: 'Nova Sato',
  username: 'novasato',
  profileName: 'novasato',
  email: 'nova@kurio.dev',
  referralCode: 'KURIO-NOVA',
  ensName: 'novasato',
}

async function quoteNovaCart(page: Page, token: string) {
  const cart = await api(page, 'GET', '/cart', { token })
  const items = cart.body.items.map(({ nftId, editionId, quantity }: any) => ({ nftId, editionId, quantity }))
  const quote = await api(page, 'POST', '/quote', { token, body: { items, network: 'ethereum' } })
  expect(quote.status).toBe(200)
  return { items, quote: quote.body }
}

test.describe('camada de mocks (MSW)', () => {
  test.skip(({ isMobile }) => isMobile, 'contratos validados uma vez, no desktop')

  test.beforeEach(async ({ page }) => {
    await page.goto('/?scenario=fast')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await page.evaluate(() => window.__kurioMock!.reset())
  })

  test('catálogo: paginação, filtros combinados, ordenação, busca e 404', async ({ page }) => {
    const all = await api(page, 'GET', '/nfts')
    expect(all.status).toBe(200)
    expect(all.body.items).toHaveLength(9)
    expect(all.body.total).toBe(60)
    expect(all.body.totalPages).toBe(7)
    expect(all.body.facets.collections).toHaveLength(9)

    const filtered = await api(page, 'GET', '/nfts?collections=arte-digital&collections=musica&networks=ethereum')
    expect(filtered.body.total).toBeGreaterThan(0)
    expect(filtered.body.total).toBeLessThan(60)
    for (const nft of filtered.body.items) {
      expect(['arte-digital', 'musica']).toContain(nft.collection.id)
      expect(nft.network).toBe('ethereum')
    }

    const sorted = await api(page, 'GET', '/nfts?sort=price-asc&pageSize=48')
    const prices = sorted.body.items.map((nft: any) => Number(nft.price))
    expect(prices).toEqual([...prices].sort((a, b) => a - b))

    const search = await api(page, 'GET', '/nfts?q=emerald%20ape')
    expect(search.body.items.map((nft: any) => nft.name)).toContain('Emerald Ape #042')

    const detail = await api(page, 'GET', '/nfts/emerald-ape-042')
    expect(detail.body.editions.map((edition: any) => edition.label)).toEqual(['1/1', '1/10', '1/50', 'Aberta'])
    expect(detail.body.editions[0].available).toBe(0)

    expect((await api(page, 'GET', '/nfts/nao-existe')).status).toBe(404)
  })

  test('sessão: login, consulta, conflito de cadastro e logout', async ({ page }) => {
    const wrong = await api(page, 'POST', '/auth/login', { body: { email: 'nova@kurio.dev', password: 'errada' } })
    expect(wrong.status).toBe(401)

    const token = await login(page)
    const session = await api(page, 'GET', '/auth/session', { token })
    expect(session.body.session.user.displayName).toBe('Nova Sato')

    const conflict = await api(page, 'POST', '/auth/register', {
      body: { username: 'outra', email: 'nova@kurio.dev', password: 'Senha1234', confirmPassword: 'Senha1234' },
    })
    expect(conflict.status).toBe(409)
    expect(conflict.body.error.fields.email).toBeTruthy()

    const invalid = await api(page, 'POST', '/auth/register', {
      body: { username: 'x', email: 'invalido', password: '123', confirmPassword: '456' },
    })
    expect(invalid.status).toBe(422)
    expect(Object.keys(invalid.body.error.fields)).toEqual(expect.arrayContaining(['username', 'email', 'password']))

    await api(page, 'POST', '/auth/logout', { token })
    expect((await api(page, 'GET', '/auth/session', { token })).status).toBe(401)
  })

  test('sessão expirada responde 401 SESSION_EXPIRED', async ({ page }) => {
    const token = await login(page)
    await page.evaluate(() => window.__kurioMock!.expireSessions())
    const result = await api(page, 'GET', '/cart', { token })
    expect(result.status).toBe(401)
    expect(result.body.error.code).toBe('SESSION_EXPIRED')
  })

  test('carrinho e cotação batem com o Figma e tratam cupons', async ({ page }) => {
    const token = await login(page)
    const cart = await api(page, 'GET', '/cart', { token })
    expect(cart.body.itemCount).toBe(17)
    expect(cart.body.subtotal).toBe('26.83')

    const { items, quote } = await quoteNovaCart(page, token)
    expect(quote.networkFee).toBe('0.016')
    expect(quote.total).toBe('26.846')

    const expired = await api(page, 'POST', '/quote', { token, body: { items, couponCode: 'GENESIS' } })
    expect(expired.body.error.code).toBe('COUPON_EXPIRED')
    const invalid = await api(page, 'POST', '/quote', { token, body: { items, couponCode: 'NAOEXISTE' } })
    expect(invalid.body.error.code).toBe('COUPON_INVALID')
    const valid = await api(page, 'POST', '/quote', { token, body: { items, couponCode: 'kurio10' } })
    expect(valid.body.discount).toBe('2.683')
    expect(valid.body.total).toBe('24.163')

    const tooMany = await api(page, 'PATCH', `/cart/items/${cart.body.items[0].id}`, { token, body: { quantity: 99 } })
    expect(tooMany.status).toBe(409)
    expect(tooMany.body.error.code).toBe('AVAILABILITY_CONFLICT')
  })

  test('pedido idempotente: mesma chave recupera o pedido; conteúdo diferente gera conflito', async ({ page }) => {
    const token = await login(page)
    const { items, quote } = await quoteNovaCart(page, token)
    const body = { quoteId: quote.id, items, network: 'ethereum', walletId: 'wal_nova_primary', collector: COLLECTOR }
    const headers = { 'Idempotency-Key': 'tentativa-1' }

    const [first, second] = await Promise.all([
      api(page, 'POST', '/orders', { token, body, headers }),
      api(page, 'POST', '/orders', { token, body, headers }),
    ])
    expect([first.status, second.status].sort()).toEqual([200, 201])
    expect(first.body.id).toBe(second.body.id)
    expect(first.body.status).toBe('pending')

    const conflict = await api(page, 'POST', '/orders', {
      token,
      headers,
      body: { ...body, collector: { ...COLLECTOR, note: 'outro conteúdo' } },
    })
    expect(conflict.body.error.code).toBe('IDEMPOTENCY_CONFLICT')

    await page.evaluate(() => window.__kurioMock!.settleOrders())
    const order = await api(page, 'GET', `/orders/${first.body.id}`, { token })
    expect(order.body.status).toBe('confirmed')
    expect(order.body.transaction.hash).toMatch(/^0x[0-9a-f]{64}$/)
    expect(order.body.total).toBe('26.846')

    const cart = await api(page, 'GET', '/cart', { token })
    expect(cart.body.items).toHaveLength(0)

    const leo = await login(page, 'leo@kurio.dev', 'Kurio@456')
    expect((await api(page, 'GET', `/orders/${first.body.id}`, { token: leo })).status).toBe(404)
  })

  test('cenários: offline, erro 500 e preço alterado no checkout', async ({ page }) => {
    await setScenario(page, 'offline')
    expect((await api(page, 'GET', '/nfts')).networkError).toBeTruthy()

    await setScenario(page, 'server-error')
    expect((await api(page, 'GET', '/nfts')).status).toBe(500)

    await setScenario(page, 'price-change')
    const token = await login(page)
    const { items, quote } = await quoteNovaCart(page, token)
    const result = await api(page, 'POST', '/orders', {
      token,
      headers: { 'Idempotency-Key': 'tentativa-preco' },
      body: { quoteId: quote.id, items, network: 'ethereum', walletId: 'wal_nova_primary', collector: COLLECTOR },
    })
    expect(result.status).toBe(409)
    expect(result.body.error.code).toBe('PRICE_CHANGED')
    expect(result.body.error.details.quote.total).toBe('27.046')
  })

  test('estado persiste após recarregar e o reset restaura a seed', async ({ page }) => {
    const token = await login(page)
    await api(page, 'PUT', '/favorites/golden-beat-207', { token })
    await page.reload()
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    const favorites = await api(page, 'GET', '/favorites', { token })
    expect(favorites.body.ids).toContain('golden-beat-207')

    await page.evaluate(() => window.__kurioMock!.reset())
    const fresh = await login(page)
    const restored = await api(page, 'GET', '/favorites', { token: fresh })
    expect(restored.body.ids).not.toContain('golden-beat-207')
    expect(restored.body.ids).toHaveLength(2)
  })
})
