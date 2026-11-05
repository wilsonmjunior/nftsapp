import type { ReactNode } from 'react'

import { ProfileNav, ProfileNavMobile } from './profile-nav'

export function AccountShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="page-container pb-[calc(var(--bottom-nav-height)+1rem)] pt-4 md:pb-16 md:pt-8">
      <h1 className="mb-6 text-2xl font-bold md:mb-8">{title}</h1>

      <ProfileNavMobile />

      <div className="mt-6 grid gap-8 lg:grid-cols-[240px_minmax(0,1fr)] lg:items-start lg:gap-10">
        <aside className="hidden rounded-xl border border-border bg-surface p-4 lg:block">
          <ProfileNav />
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  )
}
