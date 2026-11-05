import { expect, test, type Page } from '@playwright/test'

const API = 'https://api.mktnft.mock'

const favoriteButton = (page: Page, name: string) =>
  page.getByRole('button', { name: new RegExp(`^(Favoritar|Remover) ${name.replace('#', '\\#')}`) })

async function serverFavorites(page: Page) {
  return page.evaluate(async (url) => {
    const token = localStorage.getItem('kurio:session-token')
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    return (await response.json()).ids as string[]
  }, `${API}/favorites`)
}

test.beforeEach(async ({ page }) => {
  await page.goto('/?scenario=fast')
  await expect(page.getByRole('list', { name: 'NFTs', exact: true }).getByRole('listitem')).toHaveCount(9)
  await page.evaluate(() => window.__kurioMock!.reset())
})

test('favoritos: login sob demanda, atualização otimista, falha com rollback e nova tentativa', async ({ page }) => {
  await favoriteButton(page, 'Sage Nomad #009').click()
  await expect(page.getByText('Entre na sua conta para salvar favoritos.')).toBeVisible()
  const dialog = page.getByRole('dialog')
  await dialog.getByPlaceholder('contato@email.com').fill('nova@kurio.dev')
  await dialog.getByPlaceholder('Senha', { exact: true }).fill('Kurio@123')
  await dialog.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(dialog).toBeHidden()

  await expect(favoriteButton(page, 'Emerald Ape #042')).toHaveAttribute('aria-pressed', 'true')
  await expect(favoriteButton(page, 'Neon Vessel #552')).toHaveAttribute('aria-pressed', 'true')

  await favoriteButton(page, 'Sage Nomad #009').click()
  await expect(favoriteButton(page, 'Sage Nomad #009')).toHaveAttribute('aria-pressed', 'true')
  await expect.poll(() => serverFavorites(page)).toContain('sage-nomad-009')
  await page.reload()
  await expect(favoriteButton(page, 'Sage Nomad #009')).toHaveAttribute('aria-pressed', 'true')

  await page.evaluate(() => window.__kurioMock!.failNext('favorites.add', { status: 500 }))
  await favoriteButton(page, 'Cosmic Bloom #118').click()
  const toast = page.getByText('Não foi possível atualizar os favoritos. Cosmic Bloom #118 voltou ao estado anterior.')
  await expect(toast).toBeVisible()
  await expect(favoriteButton(page, 'Cosmic Bloom #118')).toHaveAttribute('aria-pressed', 'false')
  expect(await serverFavorites(page)).not.toContain('cosmic-bloom-118')

  await page.getByRole('button', { name: 'Tentar novamente' }).click()
  await expect(favoriteButton(page, 'Cosmic Bloom #118')).toHaveAttribute('aria-pressed', 'true')
  await expect.poll(() => serverFavorites(page)).toContain('cosmic-bloom-118')

  await favoriteButton(page, 'Emerald Ape #042').click()
  await expect(favoriteButton(page, 'Emerald Ape #042')).toHaveAttribute('aria-pressed', 'false')
  await expect.poll(() => serverFavorites(page)).not.toContain('emerald-ape-042')

  await page.goto('/favoritos')
  const list = page.getByRole('list', { name: 'NFTs favoritados' })
  await expect(list).toContainText('Cosmic Bloom #118')
  await expect(list).toContainText('Sage Nomad #009')
  await expect(list).not.toContainText('Emerald Ape #042')
})

test('falha de rede ao remover favorito também é revertida', async ({ page }) => {
  await page.goto('/login?redirect=/')
  await page.getByPlaceholder('contato@email.com').fill('nova@kurio.dev')
  await page.getByPlaceholder('Senha', { exact: true }).fill('Kurio@123')
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(favoriteButton(page, 'Neon Vessel #552')).toHaveAttribute('aria-pressed', 'true')

  await page.evaluate(() => window.__kurioMock!.failNext('favorites.remove', { status: 0 }))
  await favoriteButton(page, 'Neon Vessel #552').click()
  await expect(page.getByText(/Neon Vessel #552 voltou ao estado anterior/)).toBeVisible()
  await expect(favoriteButton(page, 'Neon Vessel #552')).toHaveAttribute('aria-pressed', 'true')
  expect(await serverFavorites(page)).toContain('neon-vessel-552')
})
