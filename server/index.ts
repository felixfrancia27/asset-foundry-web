import express from 'express'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const PORT = Number(process.env.PORT || 3001)
const ASSET_FOUNDRY_DIR = path.resolve(
  process.env.ASSET_FOUNDRY_DIR || path.join(process.cwd(), '..', 'asset-foundry'),
)

const app = express()
app.use(express.json())

function runCommand(args: string[]): { output: string; error?: string } {
  const res = spawnSync('python', ['-m', 'asset_foundry', ...args], {
    cwd: ASSET_FOUNDRY_DIR,
    encoding: 'utf8',
  })
  if (res.status !== 0) {
    const message = (res.stderr || '').trim() || (res.stdout || '').trim() || `command failed (${res.status})`
    return { output: '', error: message }
  }
  return { output: (res.stdout || '').trim(), error: undefined }
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

const ACTIONS: Record<string, string> = {
  compose: 'compose',
  'compose-building': 'compose-building',
  'render-previews': 'render-previews',
  'render-building': 'render-building',
  export: 'export-building',
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, assetFoundryDir: ASSET_FOUNDRY_DIR })
})

app.get('/api/jobs', (_req, res) => {
  const { output, error } = runCommand(['list-jobs'])
  if (error) return res.status(500).json({ error })
  res.json(parseJson(output) ?? [])
})

app.get('/api/jobs/:name', (req, res) => {
  const name = req.params.name
  const { output, error } = runCommand(['job-status', '--job', `jobs/${name}`])
  if (error) return res.status(500).json({ error })
  const status = (parseJson(output) ?? {}) as Record<string, unknown>
  res.json({ ...status, previews: previewFiles(name) })
})

app.post('/api/jobs/:name/review', (req, res) => {
  const name = req.params.name
  const { role, action, id } = req.body || {}
  const args = ['review', '--job', `jobs/${name}`, '--role', String(role), '--action', String(action)]
  if (id) args.push('--id', String(id))
  const { output, error } = runCommand(args)
  if (error) return res.status(400).json({ error })
  res.json({ output })
})

app.post('/api/jobs/:name/:action', (req, res) => {
  const name = req.params.name
  const command = ACTIONS[req.params.action]
  if (!command) return res.status(404).json({ error: `unknown action: ${req.params.action}` })
  const args = [command, '--job', `jobs/${name}`]
  if (command === 'export-building') args.push('--zip')
  const { output, error } = runCommand(args)
  if (error) return res.status(400).json({ error })
  res.json({ output })
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
