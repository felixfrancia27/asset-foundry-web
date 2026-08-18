import type { ReactNode } from 'react'

const STATUS_TONES: Record<string, string> = {
  draft: 'muted',
  'in-progress': 'warn',
  review: 'warn',
  approved: 'ok',
  rejected: 'danger',
  exported: 'ok',
  'needs-candidate-selection': 'muted',
  'in-review': 'warn',
}

export function Badge({ tone, children }: { tone?: string; children: ReactNode }) {
  return <span className="badge" data-tone={tone}>{children}</span>
}

export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={STATUS_TONES[status]}>{status}</Badge>
}

export function Button({
  children,
  variant,
  disabled,
  onClick,
  type,
}: {
  children: ReactNode
  variant?: 'primary' | 'danger'
  disabled?: boolean
  onClick?: () => void
  type?: 'button' | 'submit'
}) {
  return (
    <button
      type={type ?? 'button'}
      className={`btn ${variant ? `btn-${variant}` : ''}`}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

export function Panel({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="panel">
      {title && <h2 style={{ marginBottom: 14, fontSize: 15 }}>{title}</h2>}
      {children}
    </section>
  )
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>
}
