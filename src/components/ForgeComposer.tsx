import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { Button } from '../components'

const TYPES = [
  { value: 'building', label: 'Building', hint: 'Pads, refineries, plants' },
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

export default function ForgeComposer() {
  const [prompt, setPrompt] = useState('')
  const [name, setName] = useState('')
  const [nameTouched, setNameTouched] = useState(false)
  const [type, setType] = useState('building')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

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

  return (
    <section className="composer">
      <div className="composer-head">
        <h1 className="composer-title">Forge a new asset</h1>
        <p className="composer-sub">
          Describe it in plain words, or pick one straight from the classic-wgl roster.
        </p>
      </div>

      <div className="type-row">
        {TYPES.map((t) => (
          <button
            key={t.value}
            className={`type-pill ${type === t.value ? 'is-active' : ''}`}
            onClick={() => setType(t.value)}
            type="button"
          >
            <span className="type-pill-label">{t.label}</span>
            <span className="type-pill-hint">{t.hint}</span>
          </button>
        ))}
      </div>

      <textarea
        className="prompt-input"
        placeholder="e.g. A tracked excavator with a regolith bucket…"
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
            type="button"
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
  )
}
