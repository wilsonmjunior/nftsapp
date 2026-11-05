import { expect, test } from './fixtures.ts'

test.describe('fixture kurio', () => {
  test.use({ scenario: 'fast' })

  test('reset isola o estado entre testes', async ({ page, kurio }) => {
    await kurio.reset()
    await page.evaluate(() => {
      localStorage.setItem('kurio:guest-cart', JSON.stringify([{ nftId: 'x', editionId: 'y', quantity: 1 }]))
    })
    await expect.poll(async () => page.evaluate(() => localStorage.getItem('kurio:guest-cart'))).toBeTruthy()

    await kurio.reset()
    await expect.poll(async () => page.evaluate(() => localStorage.getItem('kurio:guest-cart'))).toBeNull()
    await expect.poll(async () => page.evaluate(() => window.__kurioMock!.getScenario().name)).toBe('fast')
  })

  test('cenário por teste via test.use', async ({ page, kurio }) => {
    test.info().annotations.push({ type: 'scenario', description: kurio.scenario })
    await kurio.reset()
    await expect.poll(async () => page.evaluate(() => window.__kurioMock!.getScenario().name)).toBe('fast')
  })

  test.describe('cenário lento', () => {
    test.use({ scenario: 'slow' })

    test('aplica o cenário da opção', async ({ page, kurio }) => {
      await kurio.reset()
      await expect.poll(async () => page.evaluate(() => window.__kurioMock!.getScenario().name)).toBe('slow')
    })
  })

  test('relógio controlado congela o hero até avançar o tempo', async ({ page, kurio, isMobile }) => {
    test.skip(isMobile, 'mesmo fluxo no desktop')
    await kurio.installClock()
    await kurio.reset()
    await kurio.goto('/')

    const hero = page.getByRole('region', { name: 'Destaques da Kurio' })
    await expect(hero).toBeVisible()
    const slide1 = page.getByRole('button', { name: 'Mostrar destaque 1 de 3' })
    const slide2 = page.getByRole('button', { name: 'Mostrar destaque 2 de 3' })
    await expect(slide1).toHaveAttribute('aria-current', 'true')

    await kurio.fastForward(3_000)
    await expect(slide1).toHaveAttribute('aria-current', 'true')

    // Intervalo do carrossel = 7s
    await kurio.fastForward(5_000)
    await expect(slide2).toHaveAttribute('aria-current', 'true')
  })

  test('disparo de evento nft.updated via mock chega à UI', async ({ page, kurio, isMobile }) => {
    test.skip(isMobile, 'mesmo fluxo no desktop')
    await kurio.reset()
    await kurio.loginAsNova('/nfts/emerald-ape-042')
    await expect(page.getByRole('heading', { level: 1, name: 'Emerald Ape #042' })).toBeVisible()

    await expect
      .poll(async () => page.evaluate(() => Boolean(window.__kurioSocket?.connected())))
      .toBe(true)
    await expect.poll(async () => page.evaluate(() => window.__kurioMock!.socketClients())).toBeGreaterThan(0)

    await kurio.updateNft('emerald-ape-042', {
      editionId: 'emerald-ape-042--1-50',
      price: '9.99',
    })

    await expect
      .poll(async () => page.evaluate(() => window.__kurioMock!.lastBroadcast()?.type))
      .toBe('nft.updated')
    await expect(page.getByText('9.99 ETH').first()).toBeVisible({ timeout: 10_000 })
  })
})
