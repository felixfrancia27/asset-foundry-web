import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, type JobSummary } from '../lib/api'
import { Button, EmptyState, StatusBadge, TypeBadge } from '../components'

const TYPES = [
  { value: 'building', label: 'Building', hint: 'Factories, towers, pads' },
  { value: 'vehicle', label: 'Vehicle', hint: 'Rovers, tanks, trucks' },
  { value: 'character', label: 'Character', hint: 'Heroes, NPCs, creatures' },
  { value: 'prop', label: 'Prop', hint: 'Containers, ammo, resources' },
]

const EXAMPLES = [
  { label: 'Industrial factory', type: 'building', prompt: 'Square industrial factory with tanks, pipes, and chimneys' },
  { label: 'Battle tank', type: 'vehicle', prompt: 'A tank with turret and tracks' },
  { label: 'Knight', type: 'character', prompt: 'A knight with sword and shield' },
]

function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 48) || 'new_asset'
  )
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<JobSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [prompt, setPrompt] = useState('')
  const [name, setName] = useState('')
  const [nameTouched, setNameTouched] = useState(false)
  const [type, setType] = useState('building')
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()

  const reload = () => {
    api
      .listJobs()
      .then(setJobs)
      .catch((e) => setError(e.message))
  }

  useEffect(reload, [])

  const effectiveName = nameTouched ? name : slugify(prompt)

  async function createJob() {
    setBusy(true)
    setError(null)
    try {
      const res = await api.createJob(effectiveName, prompt, type)
      setPrompt('')
      setName('')
      setNameTouched(false)
      navigate(`/jobs/${res.name}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const latest = useMemo(
    () => (jobs ? [...jobs].sort((a, b) => (b.updated ?? 0) - (a.updated ?? 0)).slice(0, 6) : []),
    [jobs],
  )

  const filtered = useMemo(
    () => (jobs ?? []).filter((job) => job.name.toLowerCase().includes(query.toLowerCase())),
    [jobs, query],
  )

  return (
    <div>
      <section className="composer">
        <h1 className="composer-title">Forge a new asset</h1>
        <p className="composer-sub">
          Describe what you want in plain words — we'll professionalize it and build the model.
        </p>

        <div className="type-row">
          {TYPES.map((t) => (
            <button
              key={t.value}
              className={`type-pill ${type === t.value ? 'is-active' : ''}`}
              onClick={() => setType(t.value)}
            >
              <span className="type-pill-label">{t.label}</span>
              <span className="type-pill-hint">{t.hint}</span>
            </button>
          ))}
        </div>

        <textarea
          className="prompt-input"
          placeholder="e.g. A knight with a glowing sword and steel armor…"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={3}
        />

        <div className="composer-footer">
          <input
            className="name-input"
            placeholder="Asset name"
            value={nameTouched ? name : slugify(prompt)}
            onChange={(e) => {
              setNameTouched(true)
              setName(e.target.value)
            }}
          />
          <Button variant="primary" disabled={busy || !prompt.trim() || !effectiveName.trim()} onClick={createJob}>
            {busy ? 'Forging…' : 'Forge asset'}
          </Button>
        </div>

        <div className="examples">
          <span className="muted" style={{ fontSize: 13 }}>
            Try:
          </span>
          {EXAMPLES.map((ex) => (
            <button
              key={ex.label}
              className="example-chip"
              onClick={() => {
                setPrompt(ex.prompt)
                setType(ex.type)
                setNameTouched(false)
              }}
            >
              {ex.label}
            </button>
          ))}
        </div>
        {error && <p className="composer-error">{error}</p>}
      </section>

      <section className="section">
        <div className="section-title-row">
          <h2>Latest models</h2>
        </div>
        {latest.length === 0 ? (
          <EmptyState>Your forged models will appear here.</EmptyState>
        ) : (
          <div className="model-grid">
            {latest.map((job) => (
              <ModelCard key={job.name} job={job} />
            ))}
          </div>
        )}
      </section>

      <section className="section">
        <div className="section-title-row">
          <h2>All models</h2>
          <input
            className="search search-sm"
            placeholder="Search models…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        {jobs === null ? (
          <EmptyState>Loading…</EmptyState>
        ) : filtered.length === 0 ? (
          <EmptyState>No models yet.</EmptyState>
        ) : (
          <div className="model-grid">
            {filtered.map((job) => (
              <ModelCard key={job.name} job={job} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function ModelCard({ job }: { job: JobSummary }) {
  return (
    <Link to={`/jobs/${job.name}`} className="model-card">
      <div className="model-thumb">
        {job.hero ? (
          <img src={job.hero} alt={job.name} loading="lazy" />
        ) : (
          <div className="model-thumb-placeholder">No preview</div>
        )}
      </div>
      <div className="model-meta">
        <span className="model-name">{job.name}</span>
        <div className="model-badges">
          <TypeBadge type={job.type} />
          <StatusBadge status={job.status} />
        </div>
      </div>
    </Link>
  )
}
