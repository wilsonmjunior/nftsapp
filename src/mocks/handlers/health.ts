import { HttpResponse } from 'msw'

import { route } from '../route'
import { scenario } from '../scenarios'

export const healthHandlers = [
  route('get', '/health', 'health', () => HttpResponse.json({ status: 'ok', mocked: true, scenario: scenario.name })),
]
