import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { accountApi } from '@/api/account'
import type { Session } from '@/api/contracts'
import { toApiError } from '@/api/errors'
import { Skeleton } from '@/components/ui/skeleton'
import { SESSION_KEY } from '@/features/session/session-query'
import { useSession } from '@/features/session/use-session'
import { toast } from 'sonner'

import { AccountShell } from './account-shell'
import { AvatarField } from './avatar-field'
import { PasswordForm } from './password-form'
import { ProfileForm } from './profile-form'
import { profileQueryOptions } from './queries'

export function ProfilePage() {
  const { user } = useSession()
  const userId = user?.id ?? ''
  const queryClient = useQueryClient()

  const profile = useQuery({
    ...profileQueryOptions(userId),
    enabled: Boolean(user),
  })

  function syncUser(next: typeof profile.data) {
    if (!next) return
    queryClient.setQueryData(profileQueryOptions(next.id).queryKey, next)
    queryClient.setQueryData<Session | null>(SESSION_KEY, (current) =>
      current ? { ...current, user: next } : current,
    )
  }

  const uploadAvatar = useMutation({
    mutationFn: accountApi.updateAvatar,
    onSuccess: syncUser,
    onError: (error) => toast.error(toApiError(error).message),
  })

  const removeAvatar = useMutation({
    mutationFn: accountApi.removeAvatar,
    onSuccess: syncUser,
    onError: (error) => toast.error(toApiError(error).message),
  })

  return (
    <AccountShell title="Meu perfil">
      {profile.isPending || !profile.data ? (
        <div className="grid gap-6 rounded-xl border border-border bg-surface p-6">
          <Skeleton className="size-20 rounded-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : profile.isError ? (
        <p role="alert" className="text-required">
          {toApiError(profile.error).message}
        </p>
      ) : (
        <div className="grid gap-8">
          <section
            aria-labelledby="avatar-title"
            className="rounded-xl border border-border bg-surface p-5 md:p-6"
          >
            <h2 id="avatar-title" className="mb-4 text-lg font-bold">
              Foto do perfil
            </h2>
            <AvatarField
              user={profile.data}
              busy={uploadAvatar.isPending || removeAvatar.isPending}
              onUpload={async (dataUrl) => {
                await uploadAvatar.mutateAsync(dataUrl)
              }}
              onRemove={async () => {
                await removeAvatar.mutateAsync()
              }}
            />
          </section>

          <section className="rounded-xl border border-border bg-surface p-5 md:p-6">
            <ProfileForm user={profile.data} />
          </section>

          <section className="rounded-xl border border-border bg-surface p-5 md:p-6">
            <PasswordForm />
          </section>
        </div>
      )}
    </AccountShell>
  )
}
