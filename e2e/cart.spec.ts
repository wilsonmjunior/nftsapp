import { expect, test, type Page } from '@playwright/test'

const API = 'https://api.mktnft.mock'

async function loginNova(page: Page, redirect = '/carrinho') {
  await page.goto(`/login?redirect=${encodeURIComponent(redirect)}`)
  await page.getByPlaceholder('contato@email.com').fill('nova@kurio.dev')
  await page.getByPlaceholder('Senha', { exact: true }).fill('Kurio@123')
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
}

async function seedGuestCart(page: Page) {
  await page.goto('/?scenario=fast')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await page.evaluate(() => {
    window.__kurioMock!.reset()
    localStorage.removeItem('kurio:session-token')
    sessionStorage.removeItem('kurio:cart-coupon')
    localStorage.setItem(
      'kurio:guest-cart',
      JSON.stringify([
        { nftId: 'emerald-ape-042', editionId: 'emerald-ape-042--1-50', quantity: 2 },
        { nftId: 'violet-nomad-314', editionId: 'violet-nomad-314--1-50', quantity: 1 },
      ]),
    )
  })
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

test('carrinho autenticado: quantidades, remoção, cupom e totais', async ({ page, isMobile }) => {
  test.skip(isMobile, 'fluxo principal coberto no desktop; mobile valida o visitante')

  await loginNova(page)
  await expect(page.getByRole('heading', { name: /Carrinho/ })).toBeVisible()
  await expect(page.getByRole('article', { name: /Emerald Ape #042/ })).toBeVisible()
  await expect(page.getByRole('article', { name: /Violet Nomad #314/ })).toBeVisible()
  await expect(page.getByRole('article', { name: /Ivory Baron #088/ })).toBeVisible()

  const emerald = page.getByRole('article', { name: /Emerald Ape #042/ })
  await emerald.getByRole('button', { name: 'Aumentar quantidade' }).click()
  await expect(emerald.getByRole('spinbutton')).toHaveValue('3')
  await expect(emerald.getByText('3.57 ETH')).toBeVisible()

  const summary = page.getByRole('complementary', { name: /Resumo da carteira/ })
  await page.getByLabel('Código promocional').fill('KURIO10')
  await page.getByRole('button', { name: 'Aplicar' }).click()
  await expect(summary.getByText(/Cupom KURIO10 aplicado/)).toBeVisible()
  await expect(summary).toContainText(/Desconto do lançamento/)
  await expect(summary.getByText(/Total/)).toBeVisible()

  await summary.getByRole('button', { name: 'Remover', exact: true }).click()
  await expect(summary.getByText(/Cupom KURIO10 aplicado/)).toHaveCount(0)

  await page.getByLabel('Código promocional').fill('GENESIS')
  await page.getByRole('button', { name: 'Aplicar' }).click()
  await expect(page.locator('#coupon-error')).toContainText(/expirou/i)

  await page.getByLabel('Código promocional').fill('INVALIDO')
  await page.getByRole('button', { name: 'Aplicar' }).click()
  await expect(page.locator('#coupon-error')).toContainText(/inválido/i)

  await page.getByRole('article', { name: /Ivory Baron #088/ }).getByRole('button', { name: /Remover Ivory Baron/ }).click()
  await expect(page.getByRole('article', { name: /Ivory Baron #088/ })).toHaveCount(0)

  await page.reload()
  await expect(page.getByRole('article', { name: /Emerald Ape #042/ })).toBeVisible()
  await expect(page.getByRole('article', { name: /Ivory Baron #088/ })).toHaveCount(0)

  await expect(page.getByRole('heading', { name: 'Colecionadores também viram' })).toBeVisible()
})

test('carrinho do visitante persiste no refresh e faz merge no login', async ({ page }) => {
  await seedGuestCart(page)
  await page.goto('/carrinho')
  await expect(page.getByRole('article', { name: /Emerald Ape #042/ })).toBeVisible()
  await expect(page.getByRole('article', { name: /Violet Nomad #314/ })).toBeVisible()

  await page.reload()
  await expect(page.getByRole('article', { name: /Emerald Ape #042/ })).toBeVisible()

  const beforeGuest = await page.evaluate(
    () => (JSON.parse(localStorage.getItem('kurio:guest-cart') || '[]') as unknown[]).length,
  )
  expect(beforeGuest).toBe(2)

  await page.getByRole('button', { name: 'Conectar e finalizar' }).click()
  await expect(page).toHaveURL(/\/login/)
  await page.getByPlaceholder('contato@email.com').fill('nova@kurio.dev')
  await page.getByPlaceholder('Senha', { exact: true }).fill('Kurio@123')
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page).toHaveURL(/\/pagamento/)

  // Carrinho do visitante foi fundido e limpo.
  await expect
    .poll(async () => page.evaluate(() => localStorage.getItem('kurio:guest-cart')))
    .toBeNull()

  const serverCount = await page.evaluate(async (url) => {
    const token = localStorage.getItem('kurio:session-token')
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    return (await response.json()).itemCount as number
  }, `${API}/cart`)
  // Nova já tinha itens; o merge soma/respeita disponibilidade — deve ter pelo menos os do fixture.
  expect(serverCount).toBeGreaterThanOrEqual(3)

  await page.goto('/carrinho')
  await expect(page.getByRole('article', { name: /Emerald Ape #042/ })).toBeVisible()
})

test('carrinho vazio e CTA para o mercado', async ({ page }) => {
  await page.goto('/carrinho?scenario=fast')
  await expect(page.getByRole('heading', { name: /carrinho está vazio/i })).toBeVisible()
  await page.getByRole('main').getByRole('link', { name: 'Explorar NFTs' }).click()
  await expect(page).toHaveURL(/\/(#catalogo)?/)
})
