import { expect, test, type Page } from '@playwright/test'

import { waitForMock } from './fixtures.ts'

async function loginNova(page: Page, redirect = '/perfil') {
  await page.goto(`/login?redirect=${encodeURIComponent(redirect)}&scenario=fast`)
  await page.getByPlaceholder('contato@email.com').fill('nova@kurio.dev')
  await page.getByPlaceholder('Senha', { exact: true }).fill('Kurio@123')
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
}

test.beforeEach(async ({ page }) => {
  await page.goto('/?scenario=fast')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await waitForMock(page)
  await page.evaluate(() => {
    window.__kurioMock!.reset()
    localStorage.removeItem('kurio:guest-cart')
    localStorage.removeItem('kurio:session-token')
    sessionStorage.removeItem('kurio:cart-coupon')
  })
})

test('edição de perfil, avatar, senha e validação de conflitos', async ({ page, isMobile }) => {
  test.skip(isMobile, 'fluxo principal no desktop; mobile cobre carteiras')
  test.setTimeout(60_000)

  await loginNova(page)
  await expect(page.getByRole('heading', { name: 'Meu perfil' })).toBeVisible()

  const menu = page.getByRole('navigation', { name: 'Menu do perfil' })
  await expect(menu).toBeVisible()
  await expect(menu.getByRole('button', { name: 'Atividade' })).toBeVisible()

  // Itens fora do escopo não fingem sucesso (aria-disabled, clique forçado)
  await menu.getByRole('button', { name: 'Atividade' }).click({ force: true })
  await expect(page.getByText(/não faz parte da demonstração/i)).toBeVisible()

  const profile = page.getByRole('form', { name: 'Dados do perfil' })
  await expect(profile.getByLabel('Nome de exibição')).toHaveValue('Nova Sato')

  await profile.getByLabel('Nome de exibição').fill('Nova Colecionadora')
  await profile.getByLabel('Apelido da carteira').fill('Nova Principal')
  await profile.getByRole('button', { name: 'Salvar perfil' }).click()
  await expect(page.getByText('Perfil atualizado.')).toBeVisible()

  await profile.getByLabel('E-mail').fill('leo@kurio.dev')
  await profile.getByRole('button', { name: 'Salvar perfil' }).click()
  await expect(profile.getByText(/e-mail já está em uso/i)).toBeVisible()

  // Restaura o e-mail; sem dirty extra o botão fica desabilitado — só confirma o campo.
  await profile.getByLabel('E-mail').fill('nova@kurio.dev')
  await expect(profile.getByLabel('E-mail')).toHaveValue('nova@kurio.dev')

  const tinyPng = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
  )
  const avatar = page.getByRole('region', { name: 'Foto do perfil' })
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    avatar.getByRole('button', { name: /Enviar foto|Alterar foto/ }).click(),
  ])
  await chooser.setFiles({ name: 'avatar.png', mimeType: 'image/png', buffer: tinyPng })
  await expect(page.getByText('Avatar atualizado.')).toBeVisible({ timeout: 10_000 })
  await expect(avatar.getByRole('button', { name: 'Remover' })).toBeVisible()

  const password = page.getByRole('form', { name: 'Alterar senha' })
  await password.getByLabel('Senha atual').fill('errada')
  await password.getByLabel('Nova senha', { exact: true }).fill('Kurio@999')
  await password.getByLabel('Confirmar nova senha').fill('Kurio@999')
  await password.getByRole('button', { name: 'Atualizar senha' }).click()
  await expect(password.getByText(/senha atual está incorreta/i)).toBeVisible()

  await password.getByLabel('Senha atual').fill('Kurio@123')
  await password.getByRole('button', { name: 'Atualizar senha' }).click()
  await expect(page.getByText('Senha alterada.')).toBeVisible()

  await page.reload()
  await expect(page.getByRole('form', { name: 'Dados do perfil' }).getByLabel('Nome de exibição')).toHaveValue(
    'Nova Colecionadora',
  )
})

test('carteiras: edição, igual à principal e endereço inválido', async ({ page, isMobile }) => {
  test.skip(isMobile, 'mesmo fluxo no desktop')

  await loginNova(page, '/perfil/carteiras')
  await expect(page.getByRole('heading', { name: 'Carteiras' })).toBeVisible()

  const primary = page.getByRole('form', { name: 'Carteira principal' })
  await expect(primary.getByLabel('Apelido')).toHaveValue('Principal')
  await expect(primary.getByLabel('Endereço 0x')).toHaveValue(/0xA91F/i)

  await primary.getByLabel('Apelido').fill('Principal Nova')
  await primary.getByRole('button', { name: 'Salvar carteira' }).click()
  await expect(page.getByText(/carteira principal salva/i)).toBeVisible()

  const secondary = page.getByRole('form', { name: 'Carteira secundária' })
  await secondary.getByLabel('Igual à carteira principal').check()
  await expect(secondary.getByLabel('Nome de exibição')).toHaveValue('Nova Sato')
  await expect(secondary.getByLabel('Endereço 0x')).toHaveValue('')

  await secondary.getByLabel('Endereço 0x').fill('0xinvalid')
  await secondary.getByRole('button', { name: 'Salvar carteira' }).click()
  await expect(secondary.getByText(/endereço 0x válido/i)).toBeVisible()

  await secondary.getByLabel('Endereço 0x').fill('0xA91F3c5e7d2b4a6f8e1c9d0b2a4f6e8c1d3bE82C')
  await secondary.getByRole('button', { name: 'Salvar carteira' }).click()
  await expect(secondary.getByText(/já está cadastrado na outra carteira/i)).toBeVisible()

  await secondary.getByLabel('Endereço 0x').fill('0x5Fb21c0d9e8a7b6c5d4e3f2a1b0c9d8e7f6a5B10')
  await secondary.getByLabel('Apelido').fill('Reserva Sync')
  await secondary.getByRole('button', { name: 'Salvar carteira' }).click()
  await expect(page.getByText(/carteira secundária salva/i)).toBeVisible()

  await page.reload()
  await expect(page.getByRole('form', { name: 'Carteira principal' }).getByLabel('Apelido')).toHaveValue('Principal Nova')
  await expect(page.getByRole('form', { name: 'Carteira secundária' }).getByLabel('Apelido')).toHaveValue('Reserva Sync')
})

test('mobile: navegação do perfil e carteiras', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'UI mobile')

  await loginNova(page)
  await expect(page.getByRole('heading', { name: 'Meu perfil' })).toBeVisible()
  const tabs = page.getByRole('tablist', { name: 'Seções do perfil' })
  await expect(tabs).toBeVisible()
  await expect(tabs.getByRole('tab', { name: 'Meu perfil' })).toHaveAttribute('aria-selected', 'true')

  await tabs.getByRole('tab', { name: 'Carteiras' }).click()
  await expect(page).toHaveURL(/\/perfil\/carteiras/)
  await expect(page.getByRole('heading', { name: 'Carteiras' })).toBeVisible()
  await expect(page.getByRole('form', { name: 'Carteira principal' })).toBeVisible()

  await page.locator('summary', { hasText: 'Mais opções' }).click()
  await page.getByRole('button', { name: 'Ofertas' }).click({ force: true })
  await expect(page.getByText(/não faz parte da demonstração/i)).toBeVisible()
})
