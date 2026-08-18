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

const ACTIONS: Record<string, string> = {
  compose: 'compose',
  'compose-building': 'compose-building',
  'render-previews': 'render-previews',
  'render-building': 'render-building',
  'render-vehicle': 'render-vehicle',
  'render-character': 'render-character',
  export: 'export-building',
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, assetFoundryDir: ASSET_FOUNDRY_DIR })
})

app.get('/api/jobs', async (_req, res) => {
  const { output, error } = await runCommand(['list-jobs'])
  if (error) return res.status(500).json({ error })
  res.json(parseJson(output) ?? [])
})

app.post('/api/jobs', async (req, res) => {
  const { name, prompt, type } = req.body || {}
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
  res.json({ ...status, previews: previewFiles(name) })
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

app.post('/api/jobs/:name/:action', async (req, res) => {
  const name = req.params.name
  const command = ACTIONS[req.params.action]
  if (!command) return res.status(404).json({ error: `unknown action: ${req.params.action}` })
  const args = [command, '--job', `jobs/${name}`]
  if (command === 'export-building') args.push('--zip')
  const { output, error } = await runCommand(args)
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
