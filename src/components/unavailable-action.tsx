import { cn } from 'cn'
import type { ComponentProps } from 'react'
import { toast } from 'sonner'

const UNAVAILABLE_MESSAGE = 'Esta seção não faz parte da demonstração.'

type UnavailableActionProps = Omit<ComponentProps<'button'>, 'onClick' | 'type'>

/** Itens do layout fora do escopo: focáveis, mas anunciados como indisponíveis. */
export function UnavailableAction({ className, children, ...props }: UnavailableActionProps) {
  return (
    <button
      type="button"
      aria-disabled="true"
      title="Disponível em breve"
      onClick={() => toast.info(UNAVAILABLE_MESSAGE, { id: 'unavailable' })}
      className={cn('cursor-not-allowed text-left', className)}
      {...props}
    >
      {children}
    </button>
  )
}
