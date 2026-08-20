import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, type ManifestAsset } from '../lib/api'
import { costParts, sizeLabel, tierLabel, useManifest } from '../lib/roster'
import { Button, EmptyState, TypeBadge } from '../components'

const ROSTER_CATEGORIES = [
  { value: '', label: 'All' },
  { value: 'building', label: 'Buildings' },
  { value: 'vehicle', label: 'Vehicles' },
  { value: 'munition', label: 'Munitions' },
  { value: 'prop', label: 'Props' },
]

const FEATURED = ['glv', 'mre_refinery', 'lulv', 'chemical_plant', 'he_missile', 'cargo_container']

export function AssetCard({
  asset,
  onForge,
  busy,
}: {
  asset: ManifestAsset
  onForge: (id: string) => void
  busy?: boolean
}) {
  return (
    <div className="asset-card">
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

      <Button variant="primary" disabled={busy} onClick={() => onForge(asset.id)}>
        {busy ? 'Forging…' : 'Forge'}
      </Button>
    </div>
  )
}

export function RosterCatalog() {
  const { manifest, error } = useManifest()
  const [category, setCategory] = useState('')
  const [query, setQuery] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [forgeError, setForgeError] = useState<string | null>(null)
  const navigate = useNavigate()

  const assets = useMemo(() => {
    if (!manifest) return []
    const byCat = category ? manifest.assets.filter((a) => a.category === category) : manifest.assets
    const byQuery = query
      ? byCat.filter((a) => (a.name + a.id + a.visual_guide).toLowerCase().includes(query.toLowerCase()))
      : byCat
    return [...byQuery].sort((a, b) => (a.tier ?? 99) - (b.tier ?? 99) || a.name.localeCompare(b.name))
  }, [manifest, category, query])

  async function forge(id: string) {
    setBusyId(id)
    setForgeError(null)
    try {
      const res = await api.createFromManifest(id)
      navigate(`/jobs/${res.name}`)
    } catch (e) {
      setForgeError(e instanceof Error ? e.message : String(e))
      setBusyId(null)
    }
  }

  return (
    <section className="section">
      <div className="section-title-row roster-head">
        <h2>Lunar-RTS roster</h2>
        <div className="roster-tabs">
          {ROSTER_CATEGORIES.map((c) => (
            <button
              key={c.value}
              className={`roster-tab ${category === c.value ? 'is-active' : ''}`}
              onClick={() => setCategory(c.value)}
              type="button"
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <input
        className="search search-sm roster-search"
        placeholder="Search the roster…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {error && <p className="composer-error">{error}</p>}
      {forgeError && <p className="composer-error">{forgeError}</p>}

      {!manifest ? (
        <EmptyState>Loading roster…</EmptyState>
      ) : assets.length === 0 ? (
        <EmptyState>No assets match.</EmptyState>
      ) : (
        <div className="roster-grid">
          {assets.map((asset) => (
            <AssetCard key={asset.id} asset={asset} onForge={forge} busy={busyId === asset.id} />
          ))}
        </div>
      )}
    </section>
  )
}

export function RosterStrip() {
  const { manifest } = useManifest()
  const navigate = useNavigate()
  const [busyId, setBusyId] = useState<string | null>(null)

  const featured = useMemo(() => {
    if (!manifest) return []
    return FEATURED.map((id) => manifest.assets.find((a) => a.id === id)).filter(Boolean) as ManifestAsset[]
  }, [manifest])

  if (!manifest) return null

  async function forge(id: string) {
    setBusyId(id)
    try {
      const res = await api.createFromManifest(id)
      navigate(`/jobs/${res.name}`)
    } catch {
      setBusyId(null)
    }
  }

  return (
    <section className="section">
      <div className="section-title-row">
        <h2>From the roster</h2>
        <Link to="/roster" className="muted" style={{ fontSize: 13 }}>
          Browse all →
        </Link>
      </div>
      <div className="roster-grid">
        {featured.map((asset) => (
          <AssetCard key={asset.id} asset={asset} onForge={forge} busy={busyId === asset.id} />
        ))}
      </div>
    </section>
  )
}
