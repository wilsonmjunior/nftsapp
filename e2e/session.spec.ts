import { expect, test, type Locator, type Page } from '@playwright/test'

const NOVA = { email: 'nova@kurio.dev', password: 'Kurio@123', name: 'Nova Sato' }
const LEO = { email: 'leo@kurio.dev', password: 'Kurio@456', name: 'Leo Martins' }
const EXPIRED_MESSAGE = 'Sua sessão expirou. Entre novamente para continuar de onde parou.'

async function fillLogin(scope: Locator | Page, credentials: { email: string; password: string }) {
  await scope.getByPlaceholder('contato@email.com').fill(credentials.email)
  await scope.getByPlaceholder('Senha', { exact: true }).fill(credentials.password)
  await scope.getByRole('button', { name: 'Entrar', exact: true }).click()
}

/** Acessa uma rota privada sem sessão, passa pelo login e volta para ela. */
async function loginThrough(page: Page, path: string, credentials = NOVA) {
  await page.goto(path)
  await expect(page).toHaveURL(/\/login\?redirect=/)
  await fillLogin(page.getByRole('main'), credentials)
  await expect(page).toHaveURL(new RegExp(`${path}$`))
}

async function logout(page: Page, isMobile: boolean) {
  if (isMobile) {
    await page.getByRole('link', { name: 'Perfil', exact: true }).click()
    await page.getByRole('button', { name: 'Sair da conta' }).click()
  } else {
    await page.getByRole('button', { name: /^Conta de/ }).click()
    await page.getByRole('menuitem', { name: 'Sair' }).click()
  }
  await expect(page.getByText('Você saiu da sua conta.')).toBeVisible()
}

test.beforeEach(async ({ page }) => {
  await page.goto('/?scenario=fast')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await page.evaluate(() => window.__kurioMock!.reset())
})

test('cadastro valida campos, mostra conflito da API e entra na conta criada', async ({ page, isMobile }) => {
  let scope: Locator
  if (isMobile) {
    await page.goto('/cadastro')
    scope = page.getByRole('main')
  } else {
    await page.getByRole('link', { name: 'Entrar' }).click()
    scope = page.getByRole('dialog')
    await scope.getByRole('tab', { name: 'Criar conta' }).click()
  }

  const submit = scope.getByRole('button', { name: 'Criar conta' })
  await submit.click()
  await expect(scope.getByText('O nome de usuário precisa ter pelo menos 3 caracteres.')).toBeVisible()
  await expect(scope.getByPlaceholder('Nome de usuário')).toBeFocused()

  await scope.getByPlaceholder('Nome de usuário').fill('novasato')
  await scope.getByPlaceholder('Digite seu e-mail').fill('nova@kurio.dev')
  await scope.getByPlaceholder('Senha', { exact: true }).fill('Senha1234')
  await scope.getByPlaceholder('Confirmar senha').fill('Senha9999')
  await submit.click()
  await expect(scope.getByText('As senhas não conferem.')).toBeVisible()

  await scope.getByPlaceholder('Confirmar senha').fill('Senha1234')
  await submit.click()
  await expect(scope.getByText('Este nome de usuário já está em uso.')).toBeVisible()
  await expect(scope.getByText('Este e-mail já está cadastrado.')).toBeVisible()
  await expect(scope.getByPlaceholder('Nome de usuário')).toHaveAttribute('aria-invalid', 'true')

  await scope.getByPlaceholder('Nome de usuário').fill('colecionador.teste')
  await scope.getByPlaceholder('Digite seu e-mail').fill('teste@kurio.dev')
  await submit.click()
  await expect(page.getByText('Conta criada. Boas-vindas, colecionador.teste!')).toBeVisible()

  // A sessão sobrevive ao refresh.
  await page.goto('/perfil')
  await expect(page.getByText('@colecionador.teste')).toBeVisible()
  await page.reload()
  await expect(page.getByText('teste@kurio.dev')).toBeVisible()
})

test('login informa credencial errada e retorna à página que pediu autenticação', async ({ page }) => {
  await page.goto('/favoritos')
  await expect(page).toHaveURL(/\/login\?redirect=%2Ffavoritos/)

  const main = page.getByRole('main')
  await fillLogin(main, { email: NOVA.email, password: 'senha-errada' })
  await expect(main.getByRole('alert')).toHaveText('E-mail ou senha incorretos.')

  await fillLogin(main, NOVA)
  await expect(page).toHaveURL(/\/favoritos$/)
  const favorites = page.getByRole('list', { name: 'NFTs favoritados' })
  await expect(favorites.getByRole('listitem')).toHaveText(['Emerald Ape #042', 'Neon Vessel #552'])

  // Já autenticado, /login devolve para o destino em vez de mostrar o formulário.
  await page.goto('/login?redirect=/perfil')
  await expect(page).toHaveURL(/\/perfil$/)
})

test('sessão expirada durante a navegação abre o login sem sair da página', async ({ page, isMobile }) => {
  await loginThrough(page, '/perfil')
  await expect(page.getByText(NOVA.email)).toBeVisible()

  await page.evaluate(() => window.__kurioMock!.expireSessions())

  if (isMobile) {
    await page.getByRole('link', { name: 'Favoritos' }).click()
  } else {
    await page.getByRole('button', { name: /^Conta de/ }).click()
    await page.getByRole('menuitem', { name: 'Favoritos' }).click()
  }

  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('status')).toHaveText(EXPIRED_MESSAGE)
  await expect(page).toHaveURL(/\/favoritos\?auth=login$/)

  await fillLogin(dialog, NOVA)
  await expect(dialog).toBeHidden()
  await expect(page).toHaveURL(/\/favoritos$/)
  await expect(page.getByRole('list', { name: 'NFTs favoritados' }).getByRole('listitem')).toHaveCount(2)
})

test('token expirado no carregamento leva ao login; fechar o modal numa página privada volta ao início', async ({
  page,
}) => {
  await loginThrough(page, '/perfil')
  await page.evaluate(() => window.__kurioMock!.expireSessions())
  await page.goto('/favoritos')
  await expect(page).toHaveURL(/\/login\?redirect=%2Ffavoritos/)

  await page.goto('/favoritos?auth=login')
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(page).toHaveURL(/\/$/)
})

test('logout e troca de usuário não deixam dados da sessão anterior', async ({ page, isMobile }) => {
  await loginThrough(page, '/favoritos', NOVA)
  await expect(page.getByText('Neon Vessel #552')).toBeVisible()
  const novaToken = await page.evaluate(() => localStorage.getItem('kurio:session-token'))

  await logout(page, isMobile)
  await expect(page).toHaveURL(/\/$/)
  expect(await page.evaluate(() => localStorage.getItem('kurio:session-token'))).toBeNull()

  await loginThrough(page, '/favoritos', LEO)
  const favorites = page.getByRole('list', { name: 'NFTs favoritados' })
  await expect(favorites.getByRole('listitem')).toHaveText(['Golden Beat #207'])
  await expect(page.getByText('Neon Vessel #552')).toHaveCount(0)

  await page.goto('/perfil')
  await expect(page.getByText(LEO.email)).toBeVisible()
  await expect(page.getByText(NOVA.email)).toHaveCount(0)

  // O token antigo foi revogado no servidor.
  const status = await page.evaluate(async (token) => {
    const response = await fetch('https://api.mktnft.mock/auth/session', { headers: { Authorization: `Bearer ${token}` } })
    return response.status
  }, novaToken)
  expect(status).toBe(401)
})

test('sair em outra aba encerra a sessão nesta', async ({ page, context, isMobile }) => {
  test.skip(isMobile, 'comportamento entre abas não depende do viewport')

  await loginThrough(page, '/perfil')
  const other = await context.newPage()
  await other.goto('/perfil')
  await expect(other.getByText(NOVA.email)).toBeVisible()

  await logout(page, false)
  await expect(other).toHaveURL(/\/login\?redirect=%2Fperfil/)
  await expect(other.getByRole('link', { name: 'Entrar' })).toBeVisible()
})
