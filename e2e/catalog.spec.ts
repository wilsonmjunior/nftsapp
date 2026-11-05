import { expect, test, type Page } from '@playwright/test'

const API = 'https://api.mktnft.mock'

const grid = (page: Page) => page.getByRole('list', { name: 'NFTs', exact: true })
const cards = (page: Page) => grid(page).getByRole('listitem')
const cardNames = (page: Page) => grid(page).getByRole('heading', { level: 3 }).allInnerTexts()
const status = (page: Page) => page.getByRole('status').filter({ hasText: /NFTs? encontrados?|Nenhum NFT/ })

async function cardPrices(page: Page) {
  const texts = await cards(page).allInnerTexts()
  return texts.map((text) => Number(/Preço:\s*([\d.]+) ETH/.exec(text)![1]))
}

async function apiTotal(page: Page, query: string) {
  return page.evaluate(async (url) => (await (await fetch(url)).json()).total as number, `${API}/nfts?${query}`)
}

/** Sidebar no desktop; painel lateral no mobile. */
async function openFilters(page: Page, isMobile: boolean) {
  if (!isMobile) return page.getByRole('complementary', { name: 'Filtros' })
  await page.getByRole('button', { name: /^Filtros e ordenação/ }).click()
  return page.getByRole('dialog', { name: 'Filtros' })
}

async function closeFilters(page: Page, isMobile: boolean) {
  if (!isMobile) return
  const dialog = page.getByRole('dialog', { name: 'Filtros' })
  await dialog.getByRole('button', { name: 'Fechar' }).click()
  await expect(dialog).toBeHidden()
}

async function chooseSort(page: Page, isMobile: boolean, label: string) {
  const scope = await openFilters(page, isMobile)
  const trigger = isMobile ? scope.getByRole('combobox', { name: 'Ordenar por:' }) : page.getByRole('combobox', { name: 'Ordenar por:' })
  await trigger.click()
  await page.getByRole('option', { name: label }).click()
  await closeFilters(page, isMobile)
}

test.beforeEach(async ({ page }) => {
  await page.goto('/?scenario=fast')
  await expect(cards(page)).toHaveCount(9)
  await page.evaluate(() => window.__kurioMock!.reset())
})

test('busca, filtros combinados, ordenação, paginação e restauração pelo histórico', async ({ page, isMobile }) => {
  await expect(status(page)).toHaveText('60 NFTs encontrados, página 1 de 7.')
  expect((await cardNames(page)).slice(0, 3)).toEqual(['Emerald Ape #042', 'Sage Nomad #009', 'Neon Vessel #552'])

  await page.getByRole('link', { name: 'Página 2' }).click()
  await expect(page).toHaveURL(/[?&]page=2/)
  await expect(status(page)).toHaveText('60 NFTs encontrados, página 2 de 7.')
  const secondPage = await cardNames(page)
  expect(secondPage).not.toContain('Emerald Ape #042')

  await page.locator('[data-catalog-search]:visible').fill('golden')
  await expect(page).toHaveURL(/[?&]q=golden/)
  await expect(page).not.toHaveURL(/page=/)
  const goldenTotal = await apiTotal(page, 'q=golden')
  await expect(status(page)).toHaveText(new RegExp(`^${goldenTotal} NFTs encontrados`))
  for (const name of await cardNames(page)) expect(name).toMatch(/golden/i)

  const filters = await openFilters(page, isMobile)
  await filters.getByRole('button', { name: /^Ethereum/ }).click()
  await expect(filters.getByRole('button', { name: /^Ethereum/ })).toHaveAttribute('aria-pressed', 'true')
  await closeFilters(page, isMobile)
  const combinedTotal = await apiTotal(page, 'q=golden&networks=ethereum')
  expect(combinedTotal).toBeLessThan(goldenTotal)
  await expect(status(page)).toHaveText(new RegExp(`^${combinedTotal} NFTs? encontrados?|^Nenhum NFT`))

  await page.locator('button[aria-label="Limpar busca"]:visible').click()
  await expect(page).not.toHaveURL(/q=/)
  const filters2 = await openFilters(page, isMobile)
  await filters2.getByRole('button', { name: /^Arte digital/ }).click()
  await filters2.getByRole('button', { name: /^Polygon/ }).click()
  await closeFilters(page, isMobile)
  const filteredTotal = await apiTotal(page, 'collections=arte-digital&networks=ethereum&networks=polygon')
  await expect(status(page)).toHaveText(new RegExp(`^${filteredTotal} NFTs? encontrados?`))

  await chooseSort(page, isMobile, 'Menor preço')
  await expect(page).toHaveURL(/sort=price-asc/)
  await expect(grid(page)).toHaveAttribute('aria-busy', 'false')
  const prices = await cardPrices(page)
  expect(prices).toEqual([...prices].sort((a, b) => a - b))
  const sortedUrl = page.url()

  await page.reload()
  await expect(status(page)).toHaveText(new RegExp(`^${filteredTotal} NFTs? encontrados?`))
  expect(await cardPrices(page)).toEqual(prices)

  await page.goBack()
  await expect(page).not.toHaveURL(/sort=/)
  await expect(status(page)).toHaveText(new RegExp(`^${filteredTotal} NFTs? encontrados?`))
  await page.goForward()
  await expect(page).toHaveURL(sortedUrl)
  expect(await cardPrices(page)).toEqual(prices)
})

test('abas e acesso ao detalhe a partir do card', async ({ page }) => {
  await page.getByRole('link', { name: 'Em alta' }).click()
  await expect(page).toHaveURL(/tab=trending/)
  await expect(page.getByRole('link', { name: 'Em alta' })).toHaveAttribute('aria-current', 'page')
  const trendingTotal = await apiTotal(page, 'tab=trending')
  await expect(status(page)).toHaveText(new RegExp(`^${trendingTotal} NFTs? encontrados?`))

  await page.getByRole('link', { name: 'Todos os NFTs' }).click()
  await expect(page).not.toHaveURL(/tab=/)
  await grid(page).getByRole('link', { name: 'Emerald Ape #042' }).click()
  await expect(page).toHaveURL(/\/nfts\/emerald-ape-042$/)
})

test('resposta lenta de um filtro anterior não sobrescreve o resultado atual', async ({ page }) => {
  const newTotal = await apiTotal(page, 'tab=new')
  const trendingTotal = await apiTotal(page, 'tab=trending')
  expect(newTotal).not.toBe(trendingTotal)

  // No cenário, a próxima busca do catálogo demora 1,8 s e a seguinte 150 ms.
  await page.evaluate(() => window.__kurioMock!.setScenario('out-of-order'))
  await page.getByRole('link', { name: 'Em alta' }).click()
  await page.getByRole('link', { name: 'Novos lançamentos' }).click()

  await expect(status(page)).toHaveText(new RegExp(`^${newTotal} NFTs? encontrados?`))
  await page.waitForTimeout(2200)
  await expect(page).toHaveURL(/tab=new/)
  await expect(status(page)).toHaveText(new RegExp(`^${newTotal} NFTs? encontrados?`))
})

test('busca sem resultado mostra estado vazio e permite limpar', async ({ page }) => {
  await page.goto('/?q=nao-existe-nada')
  await expect(page.getByText('Nenhum NFT encontrado.', { exact: true }).last()).toBeVisible()
  await page.getByRole('button', { name: 'Limpar filtros' }).last().click()
  await expect(cards(page)).toHaveCount(9)
  await expect(page.locator('[data-catalog-search]:visible')).toHaveValue('')
})

test('skeletons durante carregamento lento, falha e recuperação com nova tentativa', async ({ page }) => {
  await page.goto('/?scenario=slow')
  const loading = page.getByRole('list', { name: 'Carregando NFTs' })
  await expect(loading).toBeVisible()
  await expect(loading).toHaveAttribute('aria-busy', 'true')
  const skeletonBox = await loading.boundingBox()
  await expect(cards(page)).toHaveCount(9, { timeout: 10_000 })
  const loadedBox = await grid(page).boundingBox()
  // A grade de skeletons reserva quase a mesma área do conteúdo final (sem salto de layout).
  expect(Math.abs(loadedBox!.height - skeletonBox!.height)).toBeLessThan(loadedBox!.height * 0.1)

  await page.evaluate(() => {
    window.__kurioMock!.setScenario('fast')
    window.__kurioMock!.failNext('nfts.list', { status: 503, times: 3 })
  })
  await page.getByRole('link', { name: 'Novos lançamentos' }).click()

  const error = page.getByRole('alert').filter({ hasText: 'Não foi possível carregar os NFTs.' })
  await expect(error).toBeVisible({ timeout: 10_000 })
  await error.getByRole('button', { name: 'Tentar novamente' }).click()
  await expect(error).toBeHidden()
  await expect(cards(page).first()).toBeVisible()
})
