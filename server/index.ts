import 'dotenv/config'
import express from 'express'
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const PORT = Number(process.env.PORT || 3001)
const ASSET_FOUNDRY_DIR = path.resolve(
  process.env.ASSET_FOUNDRY_DIR || path.join(process.cwd(), '..', 'asset-foundry'),
)

const app = express()
app.use(express.json())

function runCommand(args: string[]): Promise<{ output: string; error?: string }> {
  return new Promise((resolve) => {
    const child = spawn('python', ['-m', 'asset_foundry', ...args], { cwd: ASSET_FOUNDRY_DIR })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (d) => (stdout += d))
    child.stderr.on('data', (d) => (stderr += d))
    child.on('error', (err) => resolve({ output: '', error: err.message }))
    child.on('close', (code) => {
      if (code !== 0) {
        resolve({ output: '', error: stderr.trim() || stdout.trim() || `command failed (${code})` })
      } else {
        resolve({ output: stdout.trim(), error: undefined })
      }
    })
  })
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

function previewFiles(name: string): string[] {
  const packPath = path.join(ASSET_FOUNDRY_DIR, 'jobs', name, 'review', 'previews', 'preview_pack.json')
  if (!fs.existsSync(packPath)) return []
  try {
    const pack = JSON.parse(fs.readFileSync(packPath, 'utf8'))
    const a = pack.artifacts || {}
    return [
      ...(a.part_thumbnails || []),
      ...(a.draft_views || []),
      a.clean_reference,
      a.contact_sheet,
    ].filter(Boolean)
  } catch {
    return []
  }
}

function renderedFiles(name: string): string[] {
  const workDir = path.join(ASSET_FOUNDRY_DIR, 'jobs', name, 'work')
  if (!fs.existsSync(workDir)) return []
  return fs
    .readdirSync(workDir)
    .filter((f) => /\.png$/.test(f))
    .sort()
}

function jobHero(name: string): string | null {
  const files = renderedFiles(name)
  const hero =
    files.find((f) => f.endsWith('clean.png')) ?? files.find((f) => !f.startsWith('review_'))
  return hero ? `/work/${name}/${hero}` : null
}

function jobUpdated(name: string): number {
  const dir = path.join(ASSET_FOUNDRY_DIR, 'jobs', name)
  try {
    const requestTime = fs.statSync(path.join(dir, 'request.json')).mtimeMs
    const workTime = fs.existsSync(path.join(dir, 'work'))
      ? fs.statSync(path.join(dir, 'work')).mtimeMs
      : 0
    return Math.max(requestTime, workTime)
  } catch {
    return 0
  }
}

function requestInfo(name: string): { prompt: string; style: string[] } {
  const requestPath = path.join(ASSET_FOUNDRY_DIR, 'jobs', name, 'request.json')
  if (!fs.existsSync(requestPath)) return { prompt: '', style: [] }
  try {
    const r = JSON.parse(fs.readFileSync(requestPath, 'utf8'))
    return { prompt: r.prompt || '', style: r.style?.tags || [] }
  } catch {
    return { prompt: '', style: [] }
  }
}

const ACTIONS: Record<string, string> = {
  compose: 'compose',
  'compose-building': 'compose-building',
  'render-previews': 'render-previews',
  'render-building': 'render-building',
  'render-vehicle': 'render-vehicle',
  'render-character': 'render-character',
  export: 'export-building',
}

type RefineState = {
  running: boolean
  output: string
  error?: string
}

const refineJobs = new Map<string, RefineState>()

type StepState = {
  running: boolean
  output: string
  error?: string
}

const stepJobs = new Map<string, StepState>()

function stepKey(name: string, action: string): string {
  return `${name}:${action}`
}

function startStep(name: string, action: string, command: string) {
  const key = stepKey(name, action)
  const state: StepState = { running: true, output: '' }
  stepJobs.set(key, state)
  const args = [command, '--job', `jobs/${name}`]
  if (command === 'export-building') args.push('--zip')
  const child = spawn('python', ['-m', 'asset_foundry', ...args], { cwd: ASSET_FOUNDRY_DIR })
  child.stdout.on('data', (d) => (state.output += d.toString()))
  child.stderr.on('data', (d) => (state.output += d.toString()))
  child.on('error', (err) => {
    state.error = err.message
    state.running = false
  })
  child.on('close', (code) => {
    state.running = false
    if (code !== 0 && !state.error) state.error = `step failed (exit ${code})`
  })
}

function generationSpec(name: string): { features: { name: string; color?: number[] }[] } | null {
  const specPath = path.join(ASSET_FOUNDRY_DIR, 'jobs', name, 'generation_spec.json')
  if (!fs.existsSync(specPath)) return null
  try {
    return JSON.parse(fs.readFileSync(specPath, 'utf8'))
  } catch {
    return null
  }
}

function runRefine(name: string, rounds: number) {
  const state: RefineState = { running: true, output: '' }
  refineJobs.set(name, state)
  const args = ['refine', '--job', `jobs/${name}`, '--rounds', String(Math.max(1, Math.min(20, rounds)))]
  const child = spawn('python', ['-m', 'asset_foundry', ...args], { cwd: ASSET_FOUNDRY_DIR })
  child.stdout.on('data', (d) => (state.output += d.toString()))
  child.stderr.on('data', (d) => (state.output += d.toString()))
  child.on('error', (err) => {
    state.error = err.message
    state.running = false
  })
  child.on('close', (code) => {
    state.running = false
    if (code !== 0 && !state.error) state.error = `refine failed (exit ${code})`
  })
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, assetFoundryDir: ASSET_FOUNDRY_DIR })
})

app.get('/api/manifest', async (_req, res) => {
  const { output, error } = await runCommand(['manifest'])
  if (error) return res.status(500).json({ error })
  res.json(parseJson(output) ?? { assets: [] })
})

app.get('/api/jobs', async (_req, res) => {
  const { output, error } = await runCommand(['list-jobs'])
  if (error) return res.status(500).json({ error })
  const jobs = (parseJson(output) ?? []) as { name: string }[]
  res.json(
    jobs.map((job) => ({ ...job, hero: jobHero(job.name), updated: jobUpdated(job.name) })),
  )
})

app.post('/api/jobs', async (req, res) => {
  const { name, prompt, type, manifest_id } = req.body || {}

  if (manifest_id) {
    const name = String(manifest_id)
    const jobDir = path.join(ASSET_FOUNDRY_DIR, 'jobs', name)
    if (fs.existsSync(path.join(jobDir, 'request.json'))) {
      res.json({ output: 'job already exists', name })
      return
    }
    const { output, error } = await runCommand(['init-from-manifest', '--asset-id', name])
    if (error) return res.status(400).json({ error })
    res.json({ output, name })
    return
  }

  if (!name || !prompt) return res.status(400).json({ error: 'name and prompt are required' })
  const args = ['init-job', '--name', String(name), '--prompt', String(prompt)]
  if (type) args.push('--type', String(type))
  const { output, error } = await runCommand(args)
  if (error) return res.status(400).json({ error })
  res.json({ output, name: String(name) })
})

app.post('/api/jobs/:name/candidates', async (req, res) => {
  const name = req.params.name
  const { role, title, url, author, license, license_url } = req.body || {}
  if (!role || !title || !url || !author || !license) {
    return res.status(400).json({ error: 'role, title, url, author, and license are required' })
  }
  const args = [
    'add-candidate', '--job', `jobs/${name}`,
    '--role', String(role), '--title', String(title), '--url', String(url),
    '--author', String(author), '--license', String(license),
  ]
  if (license_url) args.push('--license-url', String(license_url))
  const { output, error } = await runCommand(args)
  if (error) return res.status(400).json({ error })
  res.json({ output })
})

app.get('/api/jobs/:name', async (req, res) => {
  const name = req.params.name
  const { output, error } = await runCommand(['job-status', '--job', `jobs/${name}`])
  if (error) return res.status(500).json({ error })
  const status = (parseJson(output) ?? {}) as Record<string, unknown>
  const info = requestInfo(name)
  res.json({ ...status, ...info, previews: previewFiles(name), rendered: renderedFiles(name) })
})

app.post('/api/jobs/:name/review', async (req, res) => {
  const name = req.params.name
  const { role, action, id } = req.body || {}
  const args = ['review', '--job', `jobs/${name}`, '--role', String(role), '--action', String(action)]
  if (id) args.push('--id', String(id))
  const { output, error } = await runCommand(args)
  if (error) return res.status(400).json({ error })
  res.json({ output })
})

app.post('/api/jobs/:name/refine', (req, res) => {
  const name = req.params.name
  const existing = refineJobs.get(name)
  if (existing?.running) return res.status(409).json({ error: 'refine already running' })
  const rounds = Number((req.body || {}).rounds) || 3
  runRefine(name, rounds)
  res.json({ running: true })
})

app.get('/api/jobs/:name/refine-status', (req, res) => {
  const name = req.params.name
  const state = refineJobs.get(name)
  const spec = generationSpec(name)
  res.json({
    running: state?.running ?? false,
    output: state?.output ?? '',
    error: state?.error,
    features: spec?.features?.map((f) => ({ name: f.name, color: f.color })) ?? [],
  })
})

app.post('/api/jobs/:name/:action', (req, res) => {
  const name = req.params.name
  const command = ACTIONS[req.params.action]
  if (!command) return res.status(404).json({ error: `unknown action: ${req.params.action}` })
  const key = stepKey(name, req.params.action)
  if (stepJobs.get(key)?.running) return res.status(409).json({ error: 'step already running' })
  startStep(name, req.params.action, command)
  res.json({ running: true })
})

app.get('/api/jobs/:name/:action/status', (req, res) => {
  const name = req.params.name
  const command = ACTIONS[req.params.action]
  if (!command) return res.status(404).json({ error: `unknown action: ${req.params.action}` })
  const state = stepJobs.get(stepKey(name, req.params.action))
  res.json({
    running: state?.running ?? false,
    output: state?.output ?? '',
    error: state?.error,
  })
})

app.get('/previews/:name/:file', (req, res) => {
  const { name, file } = req.params
  if (!/^[a-z0-9_]+$/.test(name) || !/^[a-z0-9_.-]+$/.test(file)) {
    return res.status(400).send('bad path')
  }
  const filePath = path.join(ASSET_FOUNDRY_DIR, 'jobs', name, 'review', 'previews', file)
  if (!fs.existsSync(filePath)) return res.status(404).send('not found')
  res.sendFile(filePath)
})

app.get('/work/:name/:file', (req, res) => {
  const { name, file } = req.params
  if (!/^[a-z0-9_]+$/.test(name) || !/^[a-z0-9_.-]+$/.test(file)) {
    return res.status(400).send('bad path')
  }
  const filePath = path.join(ASSET_FOUNDRY_DIR, 'jobs', name, 'work', file)
  if (!fs.existsSync(filePath)) return res.status(404).send('not found')
  res.sendFile(filePath)
})

app.get('/download/:name', (req, res) => {
  const name = req.params.name
  if (!/^[a-z0-9_]+$/.test(name)) return res.status(400).send('bad path')
  const zipPath = path.join(ASSET_FOUNDRY_DIR, 'output', `${name}.zip`)
  if (!fs.existsSync(zipPath)) return res.status(404).send('no deliverable yet')
  res.download(zipPath, `${name}.zip`)
})

app.listen(PORT, () => {
  console.log(`asset-foundry-web server on http://localhost:${PORT}`)
  console.log(`using asset-foundry at ${ASSET_FOUNDRY_DIR}`)
})
