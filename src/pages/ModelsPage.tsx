import { useEffect, useMemo, useState } from 'react'
import { api, type JobSummary } from '../lib/api'
import ModelCard from '../components/ModelCard'
import { EmptyState } from '../components'

export default function ModelsPage() {
  const [jobs, setJobs] = useState<JobSummary[] | null>(null)
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api
      .listJobs()
      .then(setJobs)
      .catch((e) => setError(e.message))
  }, [])

  const filtered = useMemo(
    () => (jobs ?? []).filter((job) => job.name.toLowerCase().includes(query.toLowerCase())),
    [jobs, query],
  )

  return (
    <div>
      <div className="page-head">
        <h1 className="page-title">Models</h1>
        <p className="muted" style={{ margin: '4px 0 0', fontSize: 15 }}>
          Everything you've forged so far.
        </p>
      </div>

      <input
        className="search search-sm"
        placeholder="Search models…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {error && <p className="composer-error">{error}</p>}
      {jobs === null ? (
        <EmptyState>Loading…</EmptyState>
      ) : filtered.length === 0 ? (
        <EmptyState>No models yet — forge one.</EmptyState>
      ) : (
        <div className="model-grid">
          {filtered.map((job) => (
            <ModelCard key={job.name} job={job} />
          ))}
        </div>
      )}
    </div>
  )
}
