import { cn } from 'cn'
import { Eye, EyeOff } from 'lucide-react'
import { useState, type ComponentProps } from 'react'

import { Input } from '@/components/ui/input'

export function PasswordInput({ className, ...props }: Omit<ComponentProps<'input'>, 'type'>) {
  const [visible, setVisible] = useState(false)
  const Icon = visible ? Eye : EyeOff

  return (
    <div className="relative">
      <Input type={visible ? 'text' : 'password'} className={cn('pr-12', className)} {...props} />
      <button
        type="button"
        onClick={() => setVisible((value) => !value)}
        aria-label="Mostrar senha"
        aria-pressed={visible}
        aria-controls={props.id}
        className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-md text-subtle transition-colors hover:text-foreground"
      >
        <Icon className="size-[18px]" aria-hidden="true" />
      </button>
    </div>
  )
}
