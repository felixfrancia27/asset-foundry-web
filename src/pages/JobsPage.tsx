import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, type JobSummary, type Manifest, type ManifestAsset } from '../lib/api'
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

      <RosterCatalog />

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

const ROSTER_CATEGORIES = [
  { value: '', label: 'All' },
  { value: 'building', label: 'Buildings' },
  { value: 'vehicle', label: 'Vehicles' },
  { value: 'munition', label: 'Munitions' },
  { value: 'prop', label: 'Props' },
]

function tierLabel(tier: number | null): string | null {
  return tier === null ? null : `Tier ${tier}`
}

function sizeLabel(size?: ManifestAsset['size_meters']): string | null {
  if (!size) return null
  const dims = [size.x, size.y, size.z].filter((n) => typeof n === 'number')
  return dims.length === 3 ? `${dims.join('×')} m` : null
}

function costParts(cost?: ManifestAsset['cost']): string[] {
  if (!cost) return []
  const parts: string[] = []
  if (cost.metal_tons) parts.push(`${cost.metal_tons} t metal`)
  if (cost.cpus) parts.push(`${cost.cpus} cpu`)
  if (cost.battery_packs) parts.push(`${cost.battery_packs} batt`)
  if (cost.power_kw) parts.push(`${cost.power_kw} kW`)
  return parts
}

function RosterCatalog() {
  const [manifest, setManifest] = useState<Manifest | null>(null)
  const [category, setCategory] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    api
      .manifest()
      .then(setManifest)
      .catch((e) => setError(e.message))
  }, [])

  const assets = useMemo(() => {
    if (!manifest) return []
    const list = category ? manifest.assets.filter((a) => a.category === category) : manifest.assets
    return [...list].sort((a, b) => (a.tier ?? 99) - (b.tier ?? 99) || a.name.localeCompare(b.name))
  }, [manifest, category])

  async function forge(asset: ManifestAsset) {
    setBusyId(asset.id)
    setError(null)
    try {
      const res = await api.createFromManifest(asset.id)
      navigate(`/jobs/${res.name}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setBusyId(null)
    }
  }

  return (
    <section className="section">
      <div className="section-title-row">
        <h2>Lunar-RTS roster</h2>
        <div className="roster-tabs">
          {ROSTER_CATEGORIES.map((c) => (
            <button
              key={c.value}
              className={`roster-tab ${category === c.value ? 'is-active' : ''}`}
              onClick={() => setCategory(c.value)}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="composer-error">{error}</p>}

      {!manifest ? (
        <EmptyState>Loading roster…</EmptyState>
      ) : assets.length === 0 ? (
        <EmptyState>No assets in this category.</EmptyState>
      ) : (
        <div className="roster-grid">
          {assets.map((asset) => (
            <div key={asset.id} className="asset-card">
              <div className="asset-card-head">
                <span className="asset-name">{asset.name}</span>
                <div className="model-badges">
                  <TypeBadge type={asset.category} />
                  {tierLabel(asset.tier) && <span className="badge">{tierLabel(asset.tier)}</span>}
                </div>
              </div>

              <p className="asset-guide">{asset.visual_guide}</p>

              <div className="asset-parts">
                {asset.part_groups.map((pg) => (
                  <span key={pg.role} className="asset-part-chip" title={pg.description}>
                    {pg.role}
                  </span>
                ))}
              </div>

              <div className="asset-meta">
                {sizeLabel(asset.size_meters) && <span>{sizeLabel(asset.size_meters)}</span>}
                {costParts(asset.cost).map((c) => (
                  <span key={c}>{c}</span>
                ))}
              </div>

              <Button
                variant="primary"
                disabled={busyId !== null}
                onClick={() => forge(asset)}
              >
                {busyId === asset.id ? 'Forging…' : 'Forge'}
              </Button>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
