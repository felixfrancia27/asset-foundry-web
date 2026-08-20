import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, type JobSummary } from '../lib/api'
import ForgeComposer from '../components/ForgeComposer'
import { RosterStrip } from '../components/Roster'
import ModelCard from '../components/ModelCard'
import { EmptyState } from '../components'

export default function HomePage() {
  const [jobs, setJobs] = useState<JobSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api
      .listJobs()
      .then(setJobs)
      .catch((e) => setError(e.message))
  }, [])

  const recent = useMemo(
    () => (jobs ? [...jobs].sort((a, b) => (b.updated ?? 0) - (a.updated ?? 0)).slice(0, 6) : []),
    [jobs],
  )

  return (
    <div>
      <section className="hero">
        <div className="hero-copy">
          <span className="hero-kicker">The forge behind</span>
          <h1 className="hero-title">
            <span className="molten">classic-wgl</span>
          </h1>
          <p className="hero-sub">
            Generate, review and export the lunar-RTS asset roster — units, buildings, props and
            munitions — straight into the game's engine.
          </p>
          <div className="hero-actions">
            <Link to="/roster" className="btn btn-primary">
              Browse the roster
            </Link>
            <Link to="/models" className="btn">
              View models
            </Link>
          </div>
        </div>
      </section>

      <ForgeComposer />

      <RosterStrip />

      <section className="section">
        <div className="section-title-row">
          <h2>Recent models</h2>
          <Link to="/models" className="muted" style={{ fontSize: 13 }}>
            View all →
          </Link>
        </div>
        {error && <p className="composer-error">{error}</p>}
        {!jobs ? (
          <EmptyState>Loading…</EmptyState>
        ) : recent.length === 0 ? (
          <EmptyState>Your forged models will appear here.</EmptyState>
        ) : (
          <div className="model-grid">
            {recent.map((job) => (
              <ModelCard key={job.name} job={job} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
