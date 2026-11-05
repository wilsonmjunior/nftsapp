import { cn } from 'cn'
import { useId, type ReactNode } from 'react'

type ControlProps = {
  id: string
  'aria-invalid': boolean
  'aria-describedby': string | undefined
}

type FormFieldProps = {
  label: string
  /** O Figma usa só placeholder; o rótulo continua disponível para leitores de tela. */
  hideLabel?: boolean
  hint?: string
  error?: string
  className?: string
  children: (control: ControlProps) => ReactNode
}

export function FormField({ label, hideLabel, hint, error, className, children }: FormFieldProps) {
  const id = useId()
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined

  return (
    <div className={cn('grid gap-1.5', className)}>
      <label htmlFor={id} className={cn('text-sm font-medium', hideLabel && 'sr-only')}>
        {label}
      </label>
      {children({ id, 'aria-invalid': Boolean(error), 'aria-describedby': describedBy })}
      {hint && !error && (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-xs text-required">
          {error}
        </p>
      )}
    </div>
  )
}

export const authInputClass =
  'h-12 rounded-lg border-border bg-transparent px-4 text-sm shadow-none placeholder:text-subtle focus-visible:border-brand focus-visible:ring-brand/30 aria-invalid:border-required md:h-10 md:rounded-md dark:bg-transparent'
