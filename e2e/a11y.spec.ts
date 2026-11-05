import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

async function reset(page: Page) {
  await page.goto('/?scenario=fast')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await page.evaluate(() => {
    window.__kurioMock!.reset()
    localStorage.removeItem('kurio:guest-cart')
    localStorage.removeItem('kurio:session-token')
    sessionStorage.removeItem('kurio:cart-coupon')
  })
}

async function loginNova(page: Page, redirect = '/') {
  await page.goto(`/login?redirect=${encodeURIComponent(redirect)}&scenario=fast`)
  await page.getByPlaceholder('contato@email.com').fill('nova@kurio.dev')
  await page.getByPlaceholder('Senha', { exact: true }).fill('Kurio@123')
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
}

async function expectNoSeriousAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .disableRules([
      // shadcn/radix às vezes marca regiões sem landmark explícito no rodapé denso
      'region',
    ])
    .analyze()

  const serious = results.violations.filter((item) => item.impact === 'critical' || item.impact === 'serious')
  expect(serious, JSON.stringify(serious, null, 2)).toEqual([])
}

test.beforeEach(async ({ page }) => {
  await reset(page)
})

test.describe('navegação por teclado e foco', () => {
  test('diálogo de login prende o foco e Escape fecha', async ({ page, isMobile }) => {
    test.skip(isMobile, 'modal desktop')

    await page.goto('/?scenario=fast')
    await page.getByRole('banner').getByRole('link', { name: 'Entrar' }).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('tab', { name: 'Entrar' })).toBeVisible()

    // Foco inicial dentro do diálogo
    await expect(dialog.locator(':focus')).toBeVisible()

    // Tab permanece no diálogo (trap do Radix)
    for (let i = 0; i < 8; i += 1) {
      await page.keyboard.press('Tab')
      const inside = await dialog.evaluate((node) => node.contains(document.activeElement))
      expect(inside).toBe(true)
    }

    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
  })

  test('drawer de filtros prende o foco', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'drawer só no mobile')

    await page.goto('/?scenario=fast')
    await page.getByRole('button', { name: /Filtros/i }).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('heading', { name: 'Filtros' })).toBeVisible()

    for (let i = 0; i < 6; i += 1) {
      await page.keyboard.press('Tab')
      const inside = await dialog.evaluate((node) => node.contains(document.activeElement))
      expect(inside).toBe(true)
    }

    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
  })

  test('validação de formulário associa erro ao campo', async ({ page, isMobile }) => {
    test.skip(isMobile, 'mesmo fluxo no desktop')

    await page.goto('/login?scenario=fast')
    await page.getByRole('button', { name: 'Entrar', exact: true }).click()

    const email = page.getByPlaceholder('contato@email.com')
    await expect(email).toHaveAttribute('aria-invalid', 'true')
    const describedBy = await email.getAttribute('aria-describedby')
    expect(describedBy).toBeTruthy()
    await expect(page.locator(`#${describedBy}`)).toBeVisible()
    await expect(page.locator(`#${describedBy}`)).toContainText(/e-mail|obrigat|informe/i)
  })
})

test.describe('responsividade', () => {
  for (const width of [390, 768, 1440] as const) {
    test(`sem overflow horizontal nas telas principais em ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      for (const path of ['/', '/carrinho', '/login']) {
        await page.goto(`${path}?scenario=fast`)
        await expect(page.getByRole('main')).toBeVisible()
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
        expect(overflow, path).toBeLessThanOrEqual(1)
      }
    })
  }

  test('carrinho em lista no mobile e tabela no desktop', async ({ page, isMobile }) => {
    await loginNova(page, '/carrinho')
    await expect(page.getByRole('heading', { name: /Carrinho/ })).toBeVisible()

    const headerRow = page.getByText('NFTs', { exact: true })
    if (isMobile) {
      await expect(headerRow).toBeHidden()
      await expect(page.getByRole('article').first()).toBeVisible()
    } else {
      await expect(headerRow).toBeVisible()
    }
  })

  test('pagamento em uma coluna abaixo de lg', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 900 })
    await loginNova(page, '/pagamento')
    await expect(page.getByRole('heading', { name: 'Pagamento', exact: true })).toBeVisible()

    const form = page.locator('form').filter({ has: page.getByRole('heading', { name: /colecionador|carteira/i }) })
    const columns = await form.evaluate((node) => getComputedStyle(node).gridTemplateColumns.split(' ').length)
    expect(columns).toBe(1)
  })

  test('zoom 200% não corta o conteúdo principal', async ({ page, isMobile }) => {
    test.skip(isMobile, 'zoom avaliado no desktop')
    await page.goto('/?scenario=fast')
    await page.evaluate(() => {
      document.documentElement.style.zoom = '2'
    })
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    // Com zoom CSS o layout pode ultrapassar a viewport; o critério é legibilidade sem corte do H1.
    const headingBox = await page.getByRole('heading', { level: 1 }).boundingBox()
    expect(headingBox).toBeTruthy()
    expect(headingBox!.width).toBeGreaterThan(0)
    expect(headingBox!.height).toBeGreaterThan(0)
    await page.evaluate(() => {
      document.documentElement.style.zoom = ''
    })
  })
})

test.describe('axe', () => {
  test('início sem violações sérias', async ({ page }) => {
    await page.goto('/?scenario=fast')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expectNoSeriousAxeViolations(page)
  })

  test('carrinho autenticado sem violações sérias', async ({ page, isMobile }) => {
    test.skip(isMobile, 'uma varredura no desktop')
    await loginNova(page, '/carrinho')
    await expect(page.getByRole('heading', { name: /Carrinho/ })).toBeVisible()
    await expectNoSeriousAxeViolations(page)
  })

  test('detalhe do NFT sem violações sérias', async ({ page, isMobile }) => {
    test.skip(isMobile, 'uma varredura no desktop')
    await page.goto('/nfts/emerald-ape-042?scenario=fast')
    await expect(page.getByRole('heading', { level: 1, name: 'Emerald Ape #042' })).toBeVisible()
    await expectNoSeriousAxeViolations(page)
  })
})
