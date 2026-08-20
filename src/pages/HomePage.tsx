import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, type JobSummary } from '../lib/api'
import ForgeComposer from '../components/ForgeComposer'
import ModelCard from '../components/ModelCard'
import { EmptyState } from '../components'

const STEPS = [
  {
    n: '1',
    title: 'Forge',
    body: 'Describe it in plain words, or pick one straight from the roster.',
  },
  {
    n: '2',
    title: 'Refine',
    body: 'Review the generated model and iterate with AI-assisted feedback.',
  },
  {
    n: '3',
    title: 'Render & export',
    body: 'Get 8-direction spritesheets and a self-contained zip.',
  },
]

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
      <ForgeComposer />

      <section className="section">
        <div className="section-title-row">
          <h2>How it works</h2>
        </div>
        <div className="flow-steps">
          {STEPS.map((step) => (
            <div key={step.n} className="flow-step">
              <span className="flow-step-n">{step.n}</span>
              <div>
                <span className="flow-step-title">{step.title}</span>
                <p className="flow-step-body">{step.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

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
