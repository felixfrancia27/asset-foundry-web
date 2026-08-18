import { Routes, Route, Link } from 'react-router-dom'
import JobsPage from './pages/JobsPage'
import JobPage from './pages/JobPage'

export default function App() {
  return (
    <div className="app">
      <header className="app-header">
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <img className="logo" src="/ingot.svg" alt="Asset Foundry" />
          <span className="wordmark">
            <span className="molten">Asset Foundry</span>
          </span>
        </Link>
      </header>
      <Routes>
        <Route path="/" element={<JobsPage />} />
        <Route path="/jobs/:name" element={<JobPage />} />
      </Routes>
    </div>
  )
}
