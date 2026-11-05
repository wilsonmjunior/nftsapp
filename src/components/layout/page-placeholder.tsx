import { Link } from '@tanstack/react-router'

export function PagePlaceholder({ title }: { title: string }) {
  return (
    <div className="page-container flex flex-col items-start gap-4 py-16">
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="text-muted-foreground">Esta tela ainda está em construção.</p>
      <Link to="/" className="text-brand-strong underline underline-offset-4">
        Voltar para o início
      </Link>
    </div>
  )
}
