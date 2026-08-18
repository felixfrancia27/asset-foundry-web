import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api, type JobStatus } from '../lib/api'
import { Badge, Button, Panel, StatusBadge, EmptyState, Lightbox } from '../components'

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

function groupPreviews(files: string[]) {
  const groups: { label: string; files: string[] }[] = [
    { label: 'Parts', files: [] },
    { label: 'Draft views', files: [] },
    { label: 'Clean reference', files: [] },
    { label: 'Contact sheet', files: [] },
  ]
  for (const f of files) {
    if (f.startsWith('part_')) groups[0].files.push(f)
    else if (f.startsWith('turn_')) groups[1].files.push(f)
    else if (f.startsWith('clean')) groups[2].files.push(f)
    else if (f.startsWith('contact_sheet')) groups[3].files.push(f)
  }
  return groups.filter((g) => g.files.length > 0)
}

export default function JobPage() {
  const { name = '' } = useParams()
  const [job, setJob] = useState<JobStatus | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; tone: 'ok' | 'error' } | null>(null)
  const [lightbox, setLightbox] = useState<number | null>(null)
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
    const t = setTimeout(() => setToast(null), 4000)
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
    setError(null)
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

  const images = job.previews.map((file) => ({ src: api.previewUrl(name, file), label: file }))
  const groups = groupPreviews(job.previews)

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
              <input
                className="search"
                placeholder="Storage Tank"
                value={candForm.title}
                onChange={(e) => setCandForm({ ...candForm, title: e.target.value })}
                style={{ marginBottom: 0 }}
              />
            </label>
            <label className="muted" style={{ display: 'grid', gap: 6, fontSize: 13 }}>
              URL
              <input
                className="search"
                placeholder="https://example.com/tank"
                value={candForm.url}
                onChange={(e) => setCandForm({ ...candForm, url: e.target.value })}
                style={{ marginBottom: 0 }}
              />
            </label>
            <label className="muted" style={{ display: 'grid', gap: 6, fontSize: 13 }}>
              Author
              <input
                className="search"
                placeholder="Author"
                value={candForm.author}
                onChange={(e) => setCandForm({ ...candForm, author: e.target.value })}
                style={{ marginBottom: 0 }}
              />
            </label>
            <label className="muted" style={{ display: 'grid', gap: 6, fontSize: 13 }}>
              License
              <input
                className="search"
                placeholder="CC-BY"
                value={candForm.license}
                onChange={(e) => setCandForm({ ...candForm, license: e.target.value })}
                style={{ marginBottom: 0 }}
              />
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

      <Panel title="Pipeline">
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
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
          groups.map((group) => (
            <div key={group.label}>
              <div className="section-label">{group.label}</div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                  gap: 10,
                }}
              >
                {group.files.map((file) => {
                  const index = images.findIndex((img) => img.label === file)
                  return (
                    <div key={file} onClick={() => setLightbox(index)}>
                      <img
                        className="thumb"
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
                      <span
                        className="muted"
                        style={{ fontSize: 11, display: 'block', textAlign: 'center', marginTop: 4 }}
                      >
                        {file}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </Panel>

      {lightbox !== null && (
        <Lightbox
          images={images}
          index={lightbox}
          onClose={() => setLightbox(null)}
          onNavigate={setLightbox}
        />
      )}

      {toast && (
        <div className="toast" data-tone={toast.tone}>
          {toast.message}
        </div>
      )}
    </div>
  )
}
