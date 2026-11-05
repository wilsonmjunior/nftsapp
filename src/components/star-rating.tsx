import { cn } from 'cn'
import { Star } from 'lucide-react'

type StarRatingProps = {
  value: number
  max?: number
  /** Texto acessível completo; se omitido, usa "X de Y estrelas". */
  label?: string
  className?: string
  size?: 'sm' | 'md'
}

export function StarRating({ value, max = 5, label, className, size = 'md' }: StarRatingProps) {
  const filledCount = Math.round(value)

  return (
    <span
      role="img"
      className={cn('inline-flex items-center gap-0.5', className)}
      aria-label={label ?? `${value} de ${max} estrelas`}
    >
      {Array.from({ length: max }, (_, index) => {
        const filled = index < filledCount
        return (
          <Star
            key={index}
            aria-hidden="true"
            className={cn(size === 'sm' ? 'size-3.5' : 'size-4', filled ? 'text-brand-strong' : 'text-border')}
            fill={filled ? 'currentColor' : 'none'}
            strokeWidth={1.5}
          />
        )
      })}
    </span>
  )
}
