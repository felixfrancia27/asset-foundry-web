import { useEffect, useState } from 'react'
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

export function TypeBadge({ type }: { type: string }) {
  return <span className="badge" data-type={type}>{type}</span>
}

const LIFECYCLE = ['draft', 'in-progress', 'review', 'approved', 'exported']

export function StatusTimeline({ status }: { status: string }) {
  return (
    <div className="timeline">
      {LIFECYCLE.map((step, i) => (
        <span key={step} style={{ display: 'flex', alignItems: 'center' }}>
          {i > 0 && <span className="timeline-arrow">→</span>}
          <span className="timeline-step" data-current={status === step}>
            <span className="dot" />
            {step}
          </span>
        </span>
      ))}
    </div>
  )
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

export function Spinner() {
  return <span className="spinner" aria-hidden="true" />
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

export interface GalleryImage {
  src: string
  label: string
}

export function Gallery({ images }: { images: GalleryImage[] }) {
  const [index, setIndex] = useState<number | null>(null)

  if (images.length === 0) return null

  return (
    <div
      style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10 }}
    >
      {images.map((img, i) => (
        <div key={img.label} onClick={() => setIndex(i)} style={{ cursor: 'pointer' }}>
          <img
            className="thumb"
            src={img.src}
            alt={img.label}
            loading="lazy"
            style={{
              width: '100%',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'var(--surface-2)',
              display: 'block',
            }}
          />
          <span className="muted" style={{ fontSize: 11, display: 'block', textAlign: 'center', marginTop: 4 }}>
            {img.label}
          </span>
        </div>
      ))}
      {index !== null && (
        <Lightbox images={images} index={index} onClose={() => setIndex(null)} onNavigate={setIndex} />
      )}
    </div>
  )
}

export function Lightbox({
  images,
  index,
  onClose,
  onNavigate,
}: {
  images: GalleryImage[]
  index: number
  onClose: () => void
  onNavigate: (next: number) => void
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') onNavigate((index - 1 + images.length) % images.length)
      if (e.key === 'ArrowRight') onNavigate((index + 1) % images.length)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [index, images.length, onClose, onNavigate])

  const image = images[index]

  return (
    <div className="lightbox" onClick={onClose}>
      <button className="lightbox-nav" onClick={(e) => { e.stopPropagation(); onNavigate((index - 1 + images.length) % images.length) }}>‹</button>
      <figure className="lightbox-figure" onClick={(e) => e.stopPropagation()}>
        <img src={image.src} alt={image.label} />
        <figcaption>{image.label}</figcaption>
      </figure>
      <button className="lightbox-nav" onClick={(e) => { e.stopPropagation(); onNavigate((index + 1) % images.length) }}>›</button>
      <button className="lightbox-close" onClick={onClose}>✕</button>
    </div>
  )
}
