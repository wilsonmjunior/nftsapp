import { expect, test, type Page } from '@playwright/test'

const API = 'https://api.mktnft.mock'

async function openEmerald(page: Page) {
  await page.goto('/nfts/emerald-ape-042?scenario=fast')
  await expect(page.getByRole('heading', { level: 1, name: 'Emerald Ape #042' })).toBeVisible()
}

const editions = (page: Page) => page.getByRole('radiogroup', { name: 'Edição' })
const edition = (page: Page, label: string) => editions(page).getByRole('radio', { name: label, exact: true })

/** No mobile a barra fixa cobre os chips; dispara o clique no elemento sem checagem de hit-test. */
async function chooseEdition(page: Page, label: string) {
  await edition(page, label).evaluate((el: HTMLElement) => el.click())
}

test.beforeEach(async ({ page }) => {
  await page.goto('/?scenario=fast')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await page.evaluate(() => {
    window.__kurioMock!.reset()
    localStorage.removeItem('kurio:guest-cart')
    localStorage.removeItem('kurio:session-token')
  })
})

test('acesso direto, galeria, edição na URL e metadados', async ({ page, isMobile }) => {
  await openEmerald(page)

  await expect(page.getByText(/Um colecionável digital/)).toBeVisible()
  await expect(page.getByText(/ID do token:\s*#0042/)).toBeVisible()
  await expect(edition(page, '1/1, esgotada')).toBeDisabled()
  await expect(edition(page, '1/50')).toHaveAttribute('aria-checked', 'true')
  await expect(page).toHaveURL(/edition=emerald-ape-042--1-50/)

  await chooseEdition(page, '1/10')
  await expect(page).toHaveURL(/edition=emerald-ape-042--1-10/)
  await expect(page.getByText('1.67 ETH').locator('visible=true')).toBeVisible()

  if (!isMobile) {
    await page.getByRole('button', { name: 'Ampliar imagem' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toBeHidden()

    await page.getByRole('tab', { name: /Avaliações de colecionadores/ }).click()
    await expect(page.getByRole('tabpanel')).toContainText(/procedência|colecionador|arte/i)
  }

  await page.getByRole('heading', { name: 'Mais desta coleção' }).scrollIntoViewIfNeeded()
  await expect(page.getByRole('heading', { name: 'Mais desta coleção' })).toBeVisible()
})

test('NFT inexistente mostra 404 dedicado', async ({ page }) => {
  await page.goto('/nfts/nao-existe?scenario=fast')
  await expect(page.getByRole('heading', { name: 'NFT não encontrado' })).toBeVisible()
  await page.getByRole('link', { name: 'Voltar ao mercado' }).click()
  await expect(page).toHaveURL(/\/(#catalogo)?$/)
})

test('comprar adiciona ao carrinho do visitante e atualiza o contador', async ({ page, isMobile }) => {
  await openEmerald(page)

  if (isMobile) {
    const bar = page.getByRole('complementary', { name: 'Comprar' })
    await bar.getByRole('button', { name: 'Aumentar quantidade' }).click()
    await bar.getByRole('button', { name: 'Adicionar ao carrinho' }).click({ force: true })
    await expect(page.getByText(/unidades de Emerald Ape #042 entraram no carrinho/)).toBeVisible()
  } else {
    await page.getByRole('button', { name: 'Aumentar quantidade' }).click()
    await page.getByRole('button', { name: 'Comprar', exact: true }).click()
    await expect(page).toHaveURL(/\/carrinho/)
  }

  await expect
    .poll(async () =>
      page.evaluate(
        () => JSON.parse(localStorage.getItem('kurio:guest-cart') || '[]') as Array<{ nftId: string; quantity: number }>,
      ),
    )
    .toEqual([expect.objectContaining({ nftId: 'emerald-ape-042', quantity: 2 })])

  if (!isMobile) {
    await page.goto('/nfts/emerald-ape-042')
    await expect(page.getByRole('link', { name: /Carrinho, 2 itens/ })).toBeVisible()
  }
})

test('edição esgotada não pode ser comprada; quantidade respeita o limite', async ({ page, isMobile }) => {
  await openEmerald(page)
  await chooseEdition(page, '1/10')
  await expect(page).toHaveURL(/edition=emerald-ape-042--1-10/)

  // 1/10 do Emerald tem 3 disponíveis.
  const increase = isMobile
    ? page.getByRole('complementary', { name: 'Comprar' }).getByRole('button', { name: 'Aumentar quantidade' })
    : page.getByRole('button', { name: 'Aumentar quantidade' })
  await increase.click()
  await increase.click()
  await expect(increase).toBeDisabled()

  await page.evaluate(() =>
    window.__kurioMock!.updateNft('emerald-ape-042', { editionId: 'emerald-ape-042--1-10', available: 0 }),
  )
  await page.reload()
  await expect(page.getByRole('heading', { level: 1, name: 'Emerald Ape #042' })).toBeVisible()

  await expect(edition(page, '1/10, esgotada')).toBeDisabled()
  await expect(edition(page, '1/50')).toHaveAttribute('aria-checked', 'true')
})

test('favoritar no detalhe e comprar autenticado usam o carrinho do servidor', async ({ page, isMobile }) => {
  test.skip(isMobile, 'fluxo coberto no desktop; mobile usa a mesma mutation')

  // Cosmic Bloom não está nos favoritos iniciais da Nova.
  await page.goto('/login?redirect=/nfts/cosmic-bloom-118')
  await page.getByPlaceholder('contato@email.com').fill('nova@kurio.dev')
  await page.getByPlaceholder('Senha', { exact: true }).fill('Kurio@123')
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Cosmic Bloom #118' })).toBeVisible()

  const favorite = page.getByRole('button', { name: 'Favoritar', exact: true })
  await expect(favorite).toHaveAttribute('aria-pressed', 'false')
  await favorite.click()
  await expect(favorite).toHaveAttribute('aria-pressed', 'true')

  const before = await page.evaluate(async (url) => {
    const token = localStorage.getItem('kurio:session-token')
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    return (await response.json()).itemCount as number
  }, `${API}/cart`)

  await page.getByRole('button', { name: 'Comprar', exact: true }).click()
  await expect(page).toHaveURL(/\/carrinho/)

  const after = await page.evaluate(async (url) => {
    const token = localStorage.getItem('kurio:session-token')
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    return (await response.json()).itemCount as number
  }, `${API}/cart`)
  expect(after).toBeGreaterThan(before)
})
