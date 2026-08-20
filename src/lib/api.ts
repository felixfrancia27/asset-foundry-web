export interface JobSummary {
  name: string
  type: string
  status: string
  hero?: string | null
  updated?: number
}

export interface Candidate {
  id: string
  role: string
  mesh: boolean
}

export interface JobStatus {
  name: string
  type: string
  status: string
  review_status: string
  pending_roles: string[]
  approved_parts: string[]
  candidates: Candidate[]
  artifacts: Record<string, boolean>
  previews: string[]
  rendered: string[]
  prompt: string
  style: string[]
  manifest_id?: string
  parts?: string[]
  size_meters?: { x: number; y: number; z: number; note?: string } | null
  cost?: { metal_tons?: number; cpus?: number; battery_packs?: number; power_kw?: number | null } | null
  recommended_ppm?: number
}

export interface RefineStatus {
  running: boolean
  output: string
  error?: string
  features: { name: string; color?: number[] }[]
}

export interface ManifestPartGroup {
  role: string
  description: string
  count: number
  required: boolean
}

export interface ManifestAsset {
  id: string
  name: string
  category: string
  tier: number | null
  design_section: string
  size_meters?: { x: number; y: number; z: number; note?: string } | null
  cost?: { metal_tons?: number; cpus?: number; battery_packs?: number; power_kw?: number | null } | null
  part_groups: ManifestPartGroup[]
  rig: string
  animations: string[]
  visual_guide: string
  upgrade_of?: string
  module_role?: string
  reference?: string | null
}

export interface Manifest {
  game: string
  categories: Record<string, { label: string }>
  reference_blends: { path: string; kind: string; notes: string }[]
  assets: ManifestAsset[]
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init)
  if (!res.ok) {
    throw new Error((await res.text().catch(() => res.statusText)) || res.statusText)
  }
  return res.json() as Promise<T>
}

export const api = {
  manifest: () => request<Manifest>('/api/manifest'),
  listJobs: () => request<JobSummary[]>('/api/jobs'),
  createJob: (name: string, prompt: string, type?: string) =>
    request<{ output: string; name: string }>('/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, prompt, type }),
    }),
  createFromManifest: (manifestId: string) =>
    request<{ output: string; name: string }>('/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ manifest_id: manifestId }),
    }),
  addCandidate: (name: string, data: Record<string, string>) =>
    request<{ output: string }>(`/api/jobs/${encodeURIComponent(name)}/candidates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),
  jobStatus: (name: string) => request<JobStatus>(`/api/jobs/${encodeURIComponent(name)}`),
  review: (name: string, role: string, action: string, id?: string) =>
    request<{ output: string }>(`/api/jobs/${encodeURIComponent(name)}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, action, id }),
    }),
  run: (name: string, action: string) =>
    request<{ running: boolean }>(`/api/jobs/${encodeURIComponent(name)}/${action}`, { method: 'POST' }),
  runStatus: (name: string, action: string) =>
    request<{ running: boolean; output: string; error?: string }>(
      `/api/jobs/${encodeURIComponent(name)}/${action}/status`,
    ),
  refine: (name: string) =>
    request<{ running: boolean }>(`/api/jobs/${encodeURIComponent(name)}/refine`, { method: 'POST' }),
  refineStatus: (name: string) =>
    request<RefineStatus>(`/api/jobs/${encodeURIComponent(name)}/refine-status`),
  previewUrl: (name: string, file: string) => `/previews/${encodeURIComponent(name)}/${encodeURIComponent(file)}`,
  workUrl: (name: string, file: string) => `/work/${encodeURIComponent(name)}/${encodeURIComponent(file)}`,
  downloadUrl: (name: string) => `/download/${encodeURIComponent(name)}`,
}
