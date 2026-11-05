import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'

import { toApiError } from '@/api/errors'

/**
 * Leva os erros por campo da API para o formulário e devolve a mensagem geral
 * quando o erro não pertence a nenhum campo conhecido.
 */
export function applyApiErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: readonly Path<T>[],
): string | null {
  const apiError = toApiError(error)
  let applied = false

  for (const [name, message] of Object.entries(apiError.fields)) {
    if (!fields.includes(name as Path<T>)) continue
    setError(name as Path<T>, { type: 'server', message }, { shouldFocus: !applied })
    applied = true
  }

  return applied ? null : apiError.message
}
