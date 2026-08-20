import { Routes, Route, NavLink, Link } from 'react-router-dom'
import HomePage from './pages/HomePage'
import RosterPage from './pages/RosterPage'
import ModelsPage from './pages/ModelsPage'
import JobPage from './pages/JobPage'

export default function App() {
  return (
    <div className="app">
      <header className="app-header">
        <Link to="/" className="brand">
          <img className="logo" src="/ingot.svg" alt="Asset Foundry" />
          <span className="wordmark">
            <span className="molten">Asset Foundry</span>
          </span>
        </Link>

        <nav className="topnav">
          <NavLink to="/" end className="nav-link">
            Forge
          </NavLink>
          <NavLink to="/roster" className="nav-link">
            Roster
          </NavLink>
          <NavLink to="/models" className="nav-link">
            Models
          </NavLink>
        </nav>

        <a
          className="game-chip"
          href="https://github.com/guilledk/classic-wgl"
          target="_blank"
          rel="noreferrer"
          title="The game engine this forge feeds"
        >
          <span className="game-chip-dot" />
          classic-wgl
        </a>
      </header>

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/roster" element={<RosterPage />} />
        <Route path="/models" element={<ModelsPage />} />
        <Route path="/jobs/:name" element={<JobPage />} />
      </Routes>
    </div>
  )
}
