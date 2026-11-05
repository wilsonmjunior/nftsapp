import { useQueryClient } from '@tanstack/react-query'
import { FlaskConical } from 'lucide-react'
import { useId, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'

import { mockControl } from './runtime'
import type { ScenarioName } from './scenarios'

const CLIENT_KEYS_PREFIX = 'kurio:'
const MOCK_DB_KEY = 'kurio:mock-db'

export default function MockPanel() {
  const queryClient = useQueryClient()
  const selectId = useId()
  const descriptionId = useId()
  const [current, setCurrent] = useState(() => mockControl.getScenario().name)
  const selected = mockControl.scenarios.find((item) => item.name === current)!

  function changeScenario(name: ScenarioName) {
    mockControl.setScenario(name)
    setCurrent(name)
    void queryClient.invalidateQueries()
    toast.info(`Cenário: ${mockControl.scenarios.find((item) => item.name === name)!.label}`)
  }

  function resetAll() {
    mockControl.reset()
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith(CLIENT_KEYS_PREFIX) && key !== MOCK_DB_KEY) localStorage.removeItem(key)
    }
    for (const key of Object.keys(sessionStorage)) {
      if (key.startsWith(CLIENT_KEYS_PREFIX) && !key.startsWith('kurio:mock-')) sessionStorage.removeItem(key)
    }
    window.location.reload()
  }

  function expireSessions() {
    mockControl.expireSessions()
    void queryClient.invalidateQueries()
    toast.info('Sessões expiradas. A próxima requisição autenticada vai falhar com 401.')
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label={`Painel de mocks, cenário ${selected.label}`}
          className="fixed bottom-[calc(var(--bottom-nav-height)+0.75rem)] left-3 z-50 flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-bold text-muted-foreground shadow-lg shadow-black/40 transition-colors hover:text-brand-strong md:bottom-3 md:left-20"
        >
          <FlaskConical className="size-4" aria-hidden="true" />
          <span className="hidden sm:inline">{selected.label}</span>
        </button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[min(100vw,360px)] gap-6 p-6">
        <SheetHeader className="p-0">
          <SheetTitle>Painel de mocks</SheetTitle>
          <SheetDescription>Simula condições de rede e de negócio para a demonstração. Não faz parte do produto.</SheetDescription>
        </SheetHeader>

        <div className="space-y-2">
          <label htmlFor={selectId} className="text-sm font-bold">
            Cenário
          </label>
          <select
            id={selectId}
            value={current}
            onChange={(event) => changeScenario(event.target.value as ScenarioName)}
            aria-describedby={descriptionId}
            className="h-10 w-full rounded-md border border-input bg-surface-raised px-3 text-sm"
          >
            {mockControl.scenarios.map((item) => (
              <option key={item.name} value={item.name}>
                {item.label}
              </option>
            ))}
          </select>
          <p id={descriptionId} className="text-sm text-muted-foreground">
            {selected.description}
          </p>
        </div>

        <div className="space-y-3">
          <Button variant="outline" className="w-full" onClick={expireSessions}>
            Expirar sessões agora
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              mockControl.updateNft('emerald-ape-042', {
                editionId: 'emerald-ape-042--1-50',
                price: '1.45',
              })
              toast.info('Emerald Ape #042: preço da edição 1/50 → 1.45 ETH (via REST + socket).')
            }}
          >
            Simular preço do Emerald
          </Button>
          <Button className="w-full" onClick={resetAll}>
            Restaurar dados iniciais
          </Button>
        </div>

        <div className="space-y-1 text-sm text-muted-foreground">
          <p className="font-bold text-foreground">Contas fictícias</p>
          <p>nova@kurio.dev · Kurio@123</p>
          <p>leo@kurio.dev · Kurio@456</p>
          <p className="pt-2 font-bold text-foreground">Cupons</p>
          <p>KURIO10 · LANCAMENTO · GENESIS (expirado)</p>
        </div>
      </SheetContent>
    </Sheet>
  )
}
