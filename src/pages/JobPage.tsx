import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api, type JobStatus } from '../lib/api'
import { Badge, Button, Panel, StatusBadge, EmptyState } from '../components'

const STEPS: { key: string; label: string; command: string }[] = [
  { key: 'compose-building', label: 'Compose', command: 'compose-building' },
  { key: 'render-previews', label: 'Render previews', command: 'render-previews' },
  { key: 'render-building', label: 'Render spritesheets', command: 'render-building' },
  { key: 'export', label: 'Export + zip', command: 'export' },
]

export default function JobPage() {
  const { name = '' } = useParams()
  const [job, setJob] = useState<JobStatus | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const reload = useCallback(() => {
    api
      .jobStatus(name)
      .then(setJob)
      .catch((e) => setError(e.message))
  }, [name])

  useEffect(reload, [reload])

  async function act(fn: () => Promise<unknown>, label: string) {
    setBusy(label)
    setError(null)
    setNotice(null)
    try {
      await fn()
      setNotice(`${label} done`)
      reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }

  if (error && !job) {
    return <EmptyState>Could not load job: {error}</EmptyState>
  }

  if (!job) {
    return <EmptyState>Loading…</EmptyState>
  }

  const candidatesByRole: Record<string, string[]> = {}
  for (const c of job.candidates) {
    ;(candidatesByRole[c.role] ||= []).push(c.id)
  }

  return (
    <div className="grid">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Link to="/" className="muted" style={{ fontSize: 13 }}>
            ← Jobs
          </Link>
          <h1 style={{ fontSize: 24, marginTop: 6 }}>
            <span className="molten">{job.name}</span>
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <StatusBadge status={job.status} />
          <StatusBadge status={job.review_status} />
        </div>
      </div>

      {notice && <Panel>{notice}</Panel>}
      {error && (
        <Panel>
          <span className="btn-danger" style={{ color: 'var(--danger)' }}>
            {error}
          </span>
        </Panel>
      )}

      <Panel title="Review">
        {job.pending_roles.length === 0 ? (
          <p className="muted">Nothing pending — all parts decided.</p>
        ) : (
          <div className="grid">
            {job.pending_roles.map((role) => (
              <div key={role} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>{role}</span>
                {(candidatesByRole[role] || []).map((id) => (
                  <Button
                    key={id}
                    variant="primary"
                    disabled={busy !== null}
                    onClick={() => act(() => api.review(name, role, 'approve', id), `approve ${role}`)}
                  >
                    Approve {id}
                  </Button>
                ))}
                <Button
                  variant="danger"
                  disabled={busy !== null}
                  onClick={() => act(() => api.review(name, role, 'reject'), `reject ${role}`)}
                >
                  Reject
                </Button>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel title="Approved parts">
        {job.approved_parts.length === 0 ? (
          <p className="muted">No approved parts yet.</p>
        ) : (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {job.approved_parts.map((role) => (
              <Badge key={role} tone="ok">
                {role}
              </Badge>
            ))}
          </div>
        )}
      </Panel>

      <Panel title="Pipeline">
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {STEPS.map((step) => (
            <Button
              key={step.key}
              variant={step.key === 'export' ? 'primary' : undefined}
              disabled={busy !== null}
              onClick={() => act(() => api.run(name, step.command), step.label)}
            >
              {busy === step.label ? 'Working…' : step.label}
            </Button>
          ))}
          {job.artifacts.zip && (
            <a href={api.downloadUrl(name)} download>
              <Button>Download zip</Button>
            </a>
          )}
        </div>
      </Panel>

      <Panel title="Previews">
        {job.previews.length === 0 ? (
          <p className="muted">No previews yet — run “Render previews”.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10 }}>
            {job.previews.map((file) => (
              <a key={file} href={api.previewUrl(name, file)} target="_blank" rel="noreferrer">
                <img
                  src={api.previewUrl(name, file)}
                  alt={file}
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
                  {file}
                </span>
              </a>
            ))}
          </div>
        )}
      </Panel>
    </div>
  )
}
