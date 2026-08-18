import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api, type JobStatus } from '../lib/api'
import { Badge, Button, Panel, StatusBadge, EmptyState, Gallery } from '../components'

const STEPS_BY_TYPE: Record<string, { key: string; label: string; command: string }[]> = {
  building: [
    { key: 'compose-building', label: 'Compose', command: 'compose-building' },
    { key: 'render-previews', label: 'Render previews', command: 'render-previews' },
    { key: 'render-building', label: 'Render spritesheets', command: 'render-building' },
    { key: 'export', label: 'Export + zip', command: 'export' },
  ],
  vehicle: [
    { key: 'render-vehicle', label: 'Render vehicle', command: 'render-vehicle' },
    { key: 'export', label: 'Export + zip', command: 'export' },
  ],
  character: [
    { key: 'render-character', label: 'Render character', command: 'render-character' },
    { key: 'export', label: 'Export + zip', command: 'export' },
  ],
}

export default function JobPage() {
  const { name = '' } = useParams()
  const [job, setJob] = useState<JobStatus | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; tone: 'ok' | 'error' } | null>(null)
  const [candForm, setCandForm] = useState({ role: '', title: '', url: '', author: '', license: 'CC-BY' })

  const reload = useCallback(() => {
    api
      .jobStatus(name)
      .then(setJob)
      .catch((e) => setError(e.message))
  }, [name])

  useEffect(reload, [reload])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 5000)
    return () => clearTimeout(t)
  }, [toast])

  async function act(fn: () => Promise<unknown>, label: string) {
    setBusy(label)
    setError(null)
    try {
      await fn()
      setToast({ message: `${label} done`, tone: 'ok' })
      reload()
    } catch (e) {
      setToast({ message: e instanceof Error ? e.message : String(e), tone: 'error' })
    } finally {
      setBusy(null)
    }
  }

  async function addCandidate() {
    setBusy('add-candidate')
    try {
      await api.addCandidate(name, candForm)
      setToast({ message: `added candidate for ${candForm.role}`, tone: 'ok' })
      setCandForm({ role: '', title: '', url: '', author: '', license: 'CC-BY' })
      reload()
    } catch (e) {
      setToast({ message: e instanceof Error ? e.message : String(e), tone: 'error' })
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

  const renderedImages = job.rendered.map((file) => ({ src: api.workUrl(name, file), label: file }))
  const previewImages = job.previews.map((file) => ({ src: api.previewUrl(name, file), label: file }))
  const heroFile = job.rendered.find((f) => f.endsWith('clean.png'))
  const atlasFiles = job.rendered.filter((f) => f !== heroFile).map((f) => ({ src: api.workUrl(name, f), label: f }))

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
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Badge>{job.type}</Badge>
          <StatusBadge status={job.status} />
          <StatusBadge status={job.review_status} />
        </div>
      </div>

      {(job.prompt || job.style.length > 0) && (
        <Panel title="Generation">
          {job.prompt && <p className="muted" style={{ margin: '0 0 12px', fontStyle: 'italic' }}>“{job.prompt}”</p>}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {job.style.map((tag) => (
              <Badge key={tag}>{tag}</Badge>
            ))}
            {job.pending_roles.map((role) => (
              <Badge key={role} tone="warn">{role}</Badge>
            ))}
          </div>
        </Panel>
      )}

      <Panel title="Pipeline">
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          {(STEPS_BY_TYPE[job.type] || STEPS_BY_TYPE.building).map((step) => (
            <Button
              key={step.key}
              variant={step.key === 'export' ? 'primary' : undefined}
              disabled={busy !== null}
              onClick={() => act(() => api.run(name, step.command), step.label)}
            >
              {busy === step.label ? 'Working…' : step.label}
            </Button>
          ))}
          <Button
            disabled={busy !== null}
            onClick={() => act(() => api.run(name, 'refine'), 'Refine')}
          >
            {busy === 'Refine' ? 'Refining…' : 'Refine'}
          </Button>
          {job.artifacts.zip ? (
            <a href={api.downloadUrl(name)} download>
              <Button variant="primary">Download zip</Button>
            </a>
          ) : (
            <span className="muted" style={{ fontSize: 13 }}>
              → export first to get a zip
            </span>
          )}
        </div>
      </Panel>

      <Panel title="Rendered output">
        {renderedImages.length === 0 ? (
          <p className="muted">Nothing rendered yet — run a render step above.</p>
        ) : (
          <>
            {heroFile && (
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <img
                  src={api.workUrl(name, heroFile)}
                  alt="Clean render"
                  style={{
                    maxWidth: '100%',
                    maxHeight: 480,
                    borderRadius: 12,
                    border: '1px solid var(--border)',
                    background: 'var(--surface-2)',
                    imageRendering: 'auto',
                  }}
                />
                <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>
                  Clean render — how it looks in-game
                </p>
              </div>
            )}
            {atlasFiles.length > 0 && (
              <>
                <div className="section-label">Spritesheet atlas (8 directions × frames)</div>
                <Gallery images={atlasFiles} />
              </>
            )}
          </>
        )}
      </Panel>

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

      {job.pending_roles.length > 0 && (
        <Panel title="Add candidate">
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', alignItems: 'end' }}>
            <label className="muted" style={{ display: 'grid', gap: 6, fontSize: 13 }}>
              Role
              <select
                className="search"
                value={candForm.role}
                onChange={(e) => setCandForm({ ...candForm, role: e.target.value })}
                style={{ marginBottom: 0 }}
              >
                <option value="">Select role…</option>
                {job.pending_roles.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </label>
            <label className="muted" style={{ display: 'grid', gap: 6, fontSize: 13 }}>
              Title
              <input className="search" placeholder="Storage Tank" value={candForm.title} onChange={(e) => setCandForm({ ...candForm, title: e.target.value })} style={{ marginBottom: 0 }} />
            </label>
            <label className="muted" style={{ display: 'grid', gap: 6, fontSize: 13 }}>
              URL
              <input className="search" placeholder="https://example.com/tank" value={candForm.url} onChange={(e) => setCandForm({ ...candForm, url: e.target.value })} style={{ marginBottom: 0 }} />
            </label>
            <label className="muted" style={{ display: 'grid', gap: 6, fontSize: 13 }}>
              Author
              <input className="search" placeholder="Author" value={candForm.author} onChange={(e) => setCandForm({ ...candForm, author: e.target.value })} style={{ marginBottom: 0 }} />
            </label>
            <label className="muted" style={{ display: 'grid', gap: 6, fontSize: 13 }}>
              License
              <input className="search" placeholder="CC-BY" value={candForm.license} onChange={(e) => setCandForm({ ...candForm, license: e.target.value })} style={{ marginBottom: 0 }} />
            </label>
            <Button
              variant="primary"
              disabled={busy !== null || !candForm.role || !candForm.title || !candForm.url || !candForm.author}
              onClick={addCandidate}
            >
              Add
            </Button>
          </div>
        </Panel>
      )}

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

      {previewImages.length > 0 && (
        <Panel title="Previews">
          <Gallery images={previewImages} />
        </Panel>
      )}

      {toast && (
        <div className="toast" data-tone={toast.tone}>
          {toast.message}
        </div>
      )}
    </div>
  )
}
