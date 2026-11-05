import { ImagePlus, Trash2 } from 'lucide-react'
import { useId, useRef, useState } from 'react'
import { toast } from 'sonner'

import { AVATAR_MAX_BYTES } from '@/api/contracts'
import { Button } from '@/components/ui/button'
import { UserAvatar } from '@/features/session/components/user-menu'
import type { User } from '@/api/contracts'

type AvatarFieldProps = {
  user: User
  onUpload: (dataUrl: string) => Promise<void>
  onRemove: () => Promise<void>
  busy?: boolean
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Não foi possível ler a imagem.'))
    reader.readAsDataURL(file)
  })
}

export function AvatarField({ user, onUpload, onRemove, busy }: AvatarFieldProps) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const displayUser = preview ? { ...user, avatarUrl: preview } : user

  async function handleFile(file: File | undefined) {
    setError(null)
    if (!file) return
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) {
      setError('Envie uma imagem PNG, JPEG ou WebP.')
      return
    }
    if (file.size > AVATAR_MAX_BYTES) {
      setError('A imagem pode ter no máximo 512 KB.')
      return
    }
    try {
      const dataUrl = await readFileAsDataUrl(file)
      setPreview(dataUrl)
      await onUpload(dataUrl)
      setPreview(null)
      toast.success('Avatar atualizado.')
    } catch (err) {
      setPreview(null)
      setError(err instanceof Error ? err.message : 'Não foi possível enviar o avatar.')
    } finally {
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  async function handleRemove() {
    setError(null)
    setPreview(null)
    try {
      await onRemove()
      toast.success('Avatar removido.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível remover o avatar.')
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-4">
      <UserAvatar user={displayUser} className="size-20 text-lg" />
      <div className="grid gap-2">
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" disabled={busy} onClick={() => inputRef.current?.click()}>
            <ImagePlus className="size-4" aria-hidden="true" />
            {user.avatarUrl ? 'Alterar foto' : 'Enviar foto'}
          </Button>
          {user.avatarUrl && (
            <Button type="button" variant="ghost" disabled={busy} onClick={() => void handleRemove()}>
              <Trash2 className="size-4" aria-hidden="true" />
              Remover
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">PNG, JPEG ou WebP · máx. 512 KB</p>
        {error && (
          <p role="alert" className="text-xs text-required">
            {error}
          </p>
        )}
      </div>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="sr-only"
        onChange={(event) => void handleFile(event.target.files?.[0])}
      />
    </div>
  )
}
