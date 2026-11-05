import { cn } from 'cn'
import { Minus, Plus } from 'lucide-react'

type QuantityStepperProps = {
  value: number
  min?: number
  max: number
  onChange: (value: number) => void
  id?: string
  disabled?: boolean
  className?: string
  /** Compacto para a barra fixa do mobile. */
  size?: 'default' | 'compact'
  /** Rótulo acessível do campo numérico. */
  'aria-label'?: string
}

export function QuantityStepper({
  value,
  min = 1,
  max,
  onChange,
  id,
  disabled,
  className,
  size = 'default',
  'aria-label': ariaLabel = 'Quantidade',
}: QuantityStepperProps) {
  const canDecrease = !disabled && value > min
  const canIncrease = !disabled && value < max
  const compact = size === 'compact'

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border border-border bg-surface',
        compact ? 'h-10 gap-1 px-1' : 'h-11 gap-2 px-2',
        className,
      )}
    >
      <button
        type="button"
        aria-label="Diminuir quantidade"
        disabled={!canDecrease}
        onClick={() => onChange(Math.max(min, value - 1))}
        className={cn(
          'grid place-items-center rounded-full bg-surface-raised text-foreground transition-opacity disabled:opacity-40',
          compact ? 'size-8' : 'size-8',
        )}
      >
        <Minus className="size-4" aria-hidden="true" />
      </button>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={value}
        disabled={disabled || max < min}
        aria-label={ariaLabel}
        aria-live="polite"
        onChange={(event) => {
          const next = Number(event.target.value)
          if (!Number.isFinite(next)) return
          onChange(Math.min(max, Math.max(min, Math.trunc(next))))
        }}
        className={cn(
          'bg-transparent text-center tabular-nums outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
          compact ? 'w-8 text-sm' : 'w-10 text-base',
        )}
      />
      <button
        type="button"
        aria-label="Aumentar quantidade"
        disabled={!canIncrease}
        onClick={() => onChange(Math.min(max, value + 1))}
        className={cn(
          'grid place-items-center rounded-full bg-surface-raised text-foreground transition-opacity disabled:opacity-40',
          compact ? 'size-8' : 'size-8',
        )}
      >
        <Plus className="size-4" aria-hidden="true" />
      </button>
    </div>
  )
}
