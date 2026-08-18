import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, type JobSummary } from '../lib/api'
import { Button, Panel, StatusBadge, EmptyState } from '../components'

export default function JobsPage() {
  const [jobs, setJobs] = useState<JobSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ name: '', prompt: '' })
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()

  const reload = () => {
    api
      .listJobs()
      .then(setJobs)
      .catch((e) => setError(e.message))
  }

  useEffect(reload, [])

  async function createJob() {
    setBusy(true)
    setError(null)
    try {
      const res = await api.createJob(form.name, form.prompt)
      setCreating(false)
      setForm({ name: '', prompt: '' })
      navigate(`/jobs/${res.name}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <input
          className="search"
          placeholder="Search jobs…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ marginBottom: 0 }}
        />
        <Button variant="primary" onClick={() => setCreating((v) => !v)}>
          {creating ? 'Close' : '+ New job'}
        </Button>
      </div>

      {creating && (
        <Panel>
          <div className="grid" style={{ gridTemplateColumns: '1fr 2fr auto', alignItems: 'end' }}>
            <label className="muted" style={{ display: 'grid', gap: 6, fontSize: 13 }}>
              Name
              <input
                className="search"
                placeholder="my_factory"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                style={{ marginBottom: 0 }}
              />
            </label>
            <label className="muted" style={{ display: 'grid', gap: 6, fontSize: 13 }}>
              Prompt
              <input
                className="search"
                placeholder="Square industrial factory with tanks and pipes"
                value={form.prompt}
                onChange={(e) => setForm({ ...form, prompt: e.target.value })}
                style={{ marginBottom: 0 }}
              />
            </label>
            <Button variant="primary" disabled={busy || !form.name || !form.prompt} onClick={createJob}>
              {busy ? 'Creating…' : 'Create'}
            </Button>
          </div>
          {error && <p style={{ color: 'var(--danger)', margin: '10px 0 0' }}>{error}</p>}
        </Panel>
      )}

      {jobs === null ? (
        <EmptyState>Loading jobs…</EmptyState>
      ) : jobs.length === 0 ? (
        <EmptyState>No jobs yet — create one above to get started.</EmptyState>
      ) : (
        <div className="grid">
          {jobs
            .filter((job) => job.name.toLowerCase().includes(query.toLowerCase()))
            .map((job) => (
              <Link key={job.name} to={`/jobs/${job.name}`}>
                <Panel>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ fontSize: 17 }}>{job.name}</h2>
                    <StatusBadge status={job.status} />
                  </div>
                  <p className="muted" style={{ margin: '8px 0 0' }}>
                    {job.type}
                  </p>
                </Panel>
              </Link>
            ))}
        </div>
      )}
    </div>
  )
}
