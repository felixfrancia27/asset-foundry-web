import { useCallback, useEffect, useMemo, useState } from 'react'
import { api, type JobSummary } from '../lib/api'
import ModelCard from '../components/ModelCard'
import { EmptyState } from '../components'

const TYPES = ['', 'building', 'vehicle', 'character', 'prop']
const STATUSES = ['', 'draft', 'in-progress', 'review', 'approved', 'exported']

export default function ModelsPage() {
  const [jobs, setJobs] = useState<JobSummary[] | null>(null)
  const [query, setQuery] = useState('')
  const [type, setType] = useState('')
  const [status, setStatus] = useState('')
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(() => {
    api
      .listJobs()
      .then(setJobs)
      .catch((e) => setError(e.message))
  }, [])

  useEffect(reload, [reload])

  const filtered = useMemo(() => {
    return (jobs ?? []).filter((job) => {
      if (type && job.type !== type) return false
      if (status && job.status !== status) return false
      if (query && !job.name.toLowerCase().includes(query.toLowerCase())) return false
      return true
    })
  }, [jobs, query, type, status])

  async function remove(name: string) {
    if (!window.confirm(`Delete "${name}"? This removes the job and its export.`)) return
    try {
      await api.deleteJob(name)
      reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <div>
      <div className="page-head">
        <h1 className="page-title">Models</h1>
        <p className="muted" style={{ margin: '4px 0 0', fontSize: 15 }}>
          Everything you've forged so far.
        </p>
      </div>

      <div className="filter-row">
        <input
          className="search search-sm"
          placeholder="Search models…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select className="search search-sm" value={type} onChange={(e) => setType(e.target.value)}>
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {t || 'All types'}
            </option>
          ))}
        </select>
        <select className="search search-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s || 'All statuses'}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="composer-error">{error}</p>}
      {jobs === null ? (
        <EmptyState>Loading…</EmptyState>
      ) : filtered.length === 0 ? (
        <EmptyState>No models match.</EmptyState>
      ) : (
        <div className="model-grid">
          {filtered.map((job) => (
            <ModelCard key={job.name} job={job} onDelete={remove} />
          ))}
        </div>
      )}
    </div>
  )
}
