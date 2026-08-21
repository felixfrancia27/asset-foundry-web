import { Link } from 'react-router-dom'
import type { JobSummary } from '../lib/api'
import { StatusBadge, TypeBadge } from '../components'

export default function ModelCard({
  job,
  onDelete,
}: {
  job: JobSummary
  onDelete?: (name: string) => void
}) {
  return (
    <Link to={`/jobs/${job.name}`} className="model-card">
      <div className="model-thumb">
        {job.hero ? (
          <img src={job.hero} alt={job.name} loading="lazy" />
        ) : (
          <div className="model-thumb-placeholder">No preview</div>
        )}
        {onDelete && (
          <button
            className="model-delete"
            type="button"
            title="Delete model"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onDelete(job.name)
            }}
          >
            ✕
          </button>
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
