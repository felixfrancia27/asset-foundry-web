import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, type JobSummary } from '../lib/api'
import { Panel, StatusBadge, EmptyState } from '../components'

export default function JobsPage() {
  const [jobs, setJobs] = useState<JobSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api
      .listJobs()
      .then(setJobs)
      .catch((e) => setError(e.message))
  }, [])

  if (error) {
    return <EmptyState>Could not load jobs: {error}</EmptyState>
  }

  if (jobs === null) {
    return <EmptyState>Loading jobs…</EmptyState>
  }

  if (jobs.length === 0) {
    return (
      <EmptyState>
        No jobs yet. Start one from the Asset Foundry CLI:
        <br />
        <code className="muted">python -m asset_foundry init-job --name … --prompt "…"</code>
      </EmptyState>
    )
  }

  return (
    <div className="grid">
      {jobs.map((job) => (
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
  )
}
