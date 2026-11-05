import { expect, test } from '@playwright/test'

test.describe('layout base', () => {
  test('mostra o hero e o rodapé', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByRole('heading', { level: 1, name: /seja dono d/i })).toBeVisible()
    await expect(page.getByRole('contentinfo')).toContainText('© 2026 Kurio')
  })

  test('usa o header no desktop e a barra inferior no mobile', async ({ page, isMobile }) => {
    await page.goto('/')
    const header = page.getByRole('banner')
    const bottomNav = page.getByRole('navigation', { name: 'Principal' }).filter({ has: page.getByLabel('Explorar NFTs') })

    if (isMobile) {
      await expect(header).toBeHidden()
      await expect(bottomNav).toBeVisible()
      await expect(bottomNav.getByRole('link', { name: 'Início' })).toHaveAttribute('aria-current', 'page')
    } else {
      await expect(header).toBeVisible()
      await expect(bottomNav).toBeHidden()
      await expect(header.getByRole('link', { name: 'Início' })).toHaveAttribute('aria-current', 'page')
    }
  })

  for (const width of [390, 768, 1440]) {
    test(`não tem overflow horizontal em ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.goto('/')

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
      expect(overflow).toBeLessThanOrEqual(0)
    })
  }

  test('o skip link leva o foco ao conteúdo principal', async ({ page, isMobile }) => {
    test.skip(isMobile, 'navegação por teclado validada no desktop')
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    await page.keyboard.press('Tab')
    const skipLink = page.getByRole('link', { name: 'Pular para o conteúdo' })
    await expect(skipLink).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/#conteudo$/)
  })

  test('ações fora do escopo avisam que estão indisponíveis', async ({ page }) => {
    await page.goto('/')

    const unavailable = page.getByRole('contentinfo').getByRole('button', { name: 'Central de ajuda' })
    await expect(unavailable).toHaveAttribute('aria-disabled', 'true')
    await unavailable.click({ force: true })
    await expect(page.getByText('Esta seção não faz parte da demonstração.')).toBeVisible()
  })

  test('rotas inexistentes mostram a página 404', async ({ page }) => {
    await page.goto('/rota-inexistente')

    await expect(page.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible()
  })
})
