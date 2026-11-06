import { NETWORKS, type EditionKind } from '@/api/contracts'
import { eth, toEthString } from '@/lib/eth'

import type { DbState, EditionRecord, NftRecord, UserRecord, WalletRecord } from './db/types'
import { createRandom } from './random'

export const SCHEMA_VERSION = 3

const FIXTURE_SEED = 42
const LISTING_BASE = Date.parse('2026-10-31T12:00:00.000Z')

export const COLLECTIONS = [
  { id: 'arte-digital', name: 'Arte digital' },
  { id: 'fotografia', name: 'Fotografia' },
  { id: 'musica', name: 'Música' },
  { id: 'arte-3d', name: 'Arte 3D' },
  { id: 'colecionaveis', name: 'Colecionáveis' },
  { id: 'generativa', name: 'Generativa' },
  { id: 'jogos', name: 'Jogos' },
  { id: 'assinaturas', name: 'Assinaturas' },
  { id: 'utilidade', name: 'Utilidade' },
] as const

const CHARACTERS = {
  emerald: { names: ['Emerald Ape', 'Jade Sentinel', 'Verdant Chief', 'Lucky Clover', 'Varsity King'], attributes: ['Óculos', 'Esmeralda'] },
  nomad: { names: ['Sage Nomad', 'Violet Nomad', 'Cosmic Bloom', 'Lavender Drift', 'Bucket Monk'], attributes: ['Chapéu', 'Moletom'] },
  baron: { names: ['Neon Vessel', 'Ivory Baron', 'Onyx Diplomat', 'Midnight Envoy', 'Velvet Count'], attributes: ['Blazer', 'Gola alta'] },
  golden: { names: ['Golden Beat', 'Golden Signal', 'Amber Groove', 'Solar Rhythm', 'Honey Wave'], attributes: ['Fones', 'Jaqueta'] },
} as const

type Character = keyof typeof CHARACTERS

const FIGMA_NFTS: Array<{ name: string; number: string; character: Character; price: string; originalPrice?: string; rare?: boolean; featured?: boolean }> = [
  { name: 'Emerald Ape', number: '042', character: 'emerald', price: '1.19' },
  { name: 'Sage Nomad', number: '009', character: 'nomad', price: '1.69', featured: true },
  { name: 'Neon Vessel', number: '552', character: 'baron', price: '1.99', originalPrice: '2.29', rare: true },
  { name: 'Cosmic Bloom', number: '118', character: 'nomad', price: '1.29' },
  { name: 'Violet Nomad', number: '314', character: 'nomad', price: '1.39' },
  { name: 'Ivory Baron', number: '088', character: 'baron', price: '1.79' },
  { name: 'Golden Beat', number: '207', character: 'golden', price: '0.99' },
  { name: 'Golden Frequency', number: '071', character: 'golden', price: '0.59' },
  { name: 'Golden Signal', number: '160', character: 'golden', price: '0.39' },
]

const EDITION_MULTIPLIER: Record<EditionKind, string> = { '1/1': '3', '1/10': '1.4', '1/50': '1', open: '0.6' }
const EDITION_SUPPLY: Record<EditionKind, number | null> = { '1/1': 1, '1/10': 10, '1/50': 50, open: null }
export const OPEN_EDITION_STOCK = 999

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function round2(value: string) {
  return toEthString(eth(value).round(2))
}

function buildEditions(nftId: string, basePrice: string, originalPrice: string | null, random: ReturnType<typeof createRandom>) {
  const kinds: EditionKind[] = []
  if (random.chance(0.45)) kinds.push('1/1')
  if (random.chance(0.75)) kinds.push('1/10')
  kinds.push('1/50')
  if (random.chance(0.5)) kinds.push('open')

  return kinds.map<EditionRecord>((kind) => {
    const supply = EDITION_SUPPLY[kind]
    const available =
      kind === 'open' ? OPEN_EDITION_STOCK : kind === '1/1' ? random.int(0, 1) : random.int(kind === '1/10' ? 0 : 10, supply!)
    return {
      id: `${nftId}--${kind === 'open' ? 'aberta' : kind.replace('/', '-')}`,
      kind,
      supply,
      available,
      price: round2(eth(basePrice).times(EDITION_MULTIPLIER[kind]).toFixed()),
      originalPrice: originalPrice && kind === '1/50' ? originalPrice : null,
    }
  })
}

function buildNft(
  index: number,
  input: { name: string; number: string; character: Character; price: string; originalPrice?: string | null; rare?: boolean; featured?: boolean },
  random: ReturnType<typeof createRandom>,
): NftRecord {
  const fullName = `${input.name} #${input.number}`
  const id = slugify(fullName)
  const collection = index === 0 ? COLLECTIONS[0] : random.pick(COLLECTIONS)
  const network = index === 0 ? 'ethereum' : random.pick(NETWORKS)
  const rare = input.rare ?? random.chance(0.15)
  const character = CHARACTERS[input.character]

  return {
    id,
    name: fullName,
    tokenId: `#${input.number.padStart(4, '0')}`,
    image: input.character,
    collectionId: collection.id,
    network,
    rare,
    featured: input.featured ?? false,
    description: `Um colecionável digital finalizado à mão da coleção Kurio Editions, verificado na ${network === 'ethereum' ? 'Ethereum' : network === 'polygon' ? 'Polygon' : 'Solana'}, com arte desbloqueável e acesso para colecionadores.`,
    details: [
      `${fullName} é uma obra digital finalizada à mão da coleção Kurio Editions. Cada atributo fica armazenado nos metadados do token e verificado na rede. A obra explora identidade, movimento e luz em um mundo digital sem fronteiras.`,
      'A propriedade inclui a arte em alta resolução, lançamentos exclusivos para colecionadores e um registro permanente de procedência registrada na rede. Nova Sato recebe 5% de direitos autorais nas vendas secundárias, apoiando novos trabalhos e lançamentos da comunidade.',
    ],
    attributes: [...character.attributes, ...(rare ? ['Raro'] : [])],
    contractAddress: `0x7A42${random.hex(32)}19E8`,
    royaltiesPercent: 5,
    rating: index === 0 ? { average: 4.8, count: 19 } : { average: Number((4 + random.next()).toFixed(1)), count: random.int(0, 40) },
    popularity: random.int(1, 100),
    listedAt: new Date(LISTING_BASE - index * 9 * 3_600_000 - random.int(0, 3_600_000)).toISOString(),
    editions: buildEditions(id, input.price, input.originalPrice ?? null, random),
    version: 1,
  }
}

function buildNfts() {
  const random = createRandom(FIXTURE_SEED)
  const nfts = FIGMA_NFTS.map((nft, index) => buildNft(index, nft, random))
  const used = new Set(FIGMA_NFTS.map((nft) => nft.name))

  const pool = (Object.keys(CHARACTERS) as Character[]).flatMap((character) =>
    CHARACTERS[character].names.map((name) => ({ name, character })),
  )

  let index = nfts.length
  for (let round = 0; nfts.length < 60; round++) {
    for (const { name, character } of pool) {
      if (nfts.length >= 60) break
      if (round === 0 && used.has(name)) continue
      const price = round2(String(0.02 + 12.28 * random.next() ** 2.4))
      const discounted = random.chance(0.2)
      nfts.push(
        buildNft(
          index++,
          {
            name,
            number: String(random.int(1, 999)).padStart(3, '0'),
            character,
            price,
            originalPrice: discounted ? round2(eth(price).times(1 + random.int(10, 30) / 100).toFixed()) : null,
          },
          random,
        ),
      )
    }
  }

  tuneFigmaScenarios(nfts)
  return nfts
}

function tuneFigmaScenarios(nfts: NftRecord[]) {
  const byName = (name: string) => nfts.find((nft) => nft.name === name)!

  const emerald = byName('Emerald Ape #042')
  emerald.editions = [
    { id: `${emerald.id}--1-1`, kind: '1/1', supply: 1, available: 0, price: '3.57', originalPrice: null },
    { id: `${emerald.id}--1-10`, kind: '1/10', supply: 10, available: 3, price: '1.67', originalPrice: null },
    { id: `${emerald.id}--1-50`, kind: '1/50', supply: 50, available: 24, price: '1.19', originalPrice: null },
    { id: `${emerald.id}--aberta`, kind: 'open', supply: null, available: OPEN_EDITION_STOCK, price: '0.71', originalPrice: null },
  ]

  for (const name of ['Violet Nomad #314', 'Ivory Baron #088']) {
    const edition = byName(name).editions.find((item) => item.kind === '1/50')!
    edition.available = Math.max(edition.available, 30)
  }

  for (const edition of nfts[20]!.editions) edition.available = 0
}

const NOVA_PRIMARY_ADDRESS = '0xA91F3c5e7d2b4a6f8e1c9d0b2a4f6e8c1d3bE82C'
const NOVA_SECONDARY_ADDRESS = '0x5Fb21c0d9e8a7b6c5d4e3f2a1b0c9d8e7f6a5B10'
const LEO_PRIMARY_ADDRESS = '0x3C0d4E5f6A7b8C9d0E1f2A3b4C5d6E7f8A9b0C1D'

export const FIXTURE_USERS = [
  { email: 'nova@kurio.dev', password: 'Kurio@123' },
  { email: 'leo@kurio.dev', password: 'Kurio@456' },
] as const

function buildUsers(): UserRecord[] {
  return [
    {
      id: 'usr_nova',
      username: 'novasato',
      displayName: 'Nova Sato',
      email: 'nova@kurio.dev',
      passwordHash:
        'pbkdf2$100000$6b7572696f2d6e6f76612d73616c7431$f16185afaad2bf8f5b6df7d8682f1caf5d4d532d48e9574d7862360587093b77',
      googleSub: null,
      avatarUrl: null,
      ensName: 'novasato',
      walletNickname: 'Principal',
      createdAt: '2026-03-12T10:00:00.000Z',
    },
    {
      id: 'usr_leo',
      username: 'leomartins',
      displayName: 'Leo Martins',
      email: 'leo@kurio.dev',
      passwordHash:
        'pbkdf2$100000$6b7572696f2d6c656f2d73616c743132$3bef1ba62c7c08720e0926741dce80dbee27a142c6e43daabd3102bc6651e821',
      googleSub: null,
      avatarUrl: null,
      ensName: 'leomartins',
      walletNickname: 'Carteira do Leo',
      createdAt: '2026-05-02T15:30:00.000Z',
    },
  ]
}

function wallet(userId: string, slot: 'primary' | 'secondary', data: Omit<WalletRecord, 'id' | 'slot' | 'version'>): WalletRecord {
  return { ...data, id: `wal_${userId.replace('usr_', '')}_${slot}`, slot, version: 1 }
}

export function createSeedState(): DbState {
  const nfts = buildNfts()
  const edition1of50 = (name: string) => {
    const nft = nfts.find((item) => item.name === name)!
    const edition = nft.editions.find((item) => item.kind === '1/50')!
    return { nftId: nft.id, editionId: edition.id, priceAtAdd: edition.price }
  }

  return {
    schemaVersion: SCHEMA_VERSION,
    sequence: 1000,
    collections: [...COLLECTIONS],
    nfts,
    users: buildUsers(),
    sessions: [],
    favorites: {
      usr_nova: [nfts[0]!.id, nfts[2]!.id],
      usr_leo: [nfts[6]!.id],
    },
    carts: {
      usr_nova: {
        version: 1,
        updatedAt: '2026-11-01T09:00:00.000Z',
        items: [
          { id: 'cit_nova_1', quantity: 2, ...edition1of50('Emerald Ape #042') },
          { id: 'cit_nova_2', quantity: 6, ...edition1of50('Violet Nomad #314') },
          { id: 'cit_nova_3', quantity: 9, ...edition1of50('Ivory Baron #088') },
        ],
      },
      usr_leo: { version: 1, updatedAt: '2026-11-01T09:00:00.000Z', items: [] },
    },
    coupons: [
      { code: 'KURIO10', description: '10% de desconto no lançamento', kind: 'percent', value: '10', expiresAt: null },
      { code: 'LANCAMENTO', description: '0.05 ETH de desconto', kind: 'fixed', value: '0.05', expiresAt: null },
      { code: 'GENESIS', description: 'Cupom do lançamento gênesis', kind: 'percent', value: '20', expiresAt: '2026-01-31T23:59:59.000Z' },
    ],
    wallets: {
      usr_nova: {
        primary: wallet('usr_nova', 'primary', {
          displayName: 'Nova Sato',
          nickname: 'Principal',
          network: 'ethereum',
          profileName: 'novasato',
          address: NOVA_PRIMARY_ADDRESS,
          secondaryAddress: '',
          type: 'metamask',
          referralCode: 'KURIO-NOVA',
          email: 'nova@kurio.dev',
          ensName: 'novasato',
        }),
        secondary: wallet('usr_nova', 'secondary', {
          displayName: 'Nova Sato',
          nickname: 'Reserva',
          network: 'polygon',
          profileName: 'novasato',
          address: NOVA_SECONDARY_ADDRESS,
          secondaryAddress: 'nova.kurio.eth',
          type: 'coinbase',
          referralCode: 'KURIO-NOVA',
          email: 'nova@kurio.dev',
          ensName: 'novasato',
        }),
      },
      usr_leo: {
        primary: wallet('usr_leo', 'primary', {
          displayName: 'Leo Martins',
          nickname: 'Carteira do Leo',
          network: 'polygon',
          profileName: 'leomartins',
          address: LEO_PRIMARY_ADDRESS,
          secondaryAddress: '',
          type: 'walletconnect',
          referralCode: 'KURIO-LEO',
          email: 'leo@kurio.dev',
          ensName: 'leomartins',
        }),
      },
    },
    quotes: {},
    orders: [],
    idempotency: {},
    triggered: [],
  }
}
