export interface JobSummary {
  name: string
  type: string
  status: string
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
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init)
  if (!res.ok) {
    throw new Error((await res.text().catch(() => res.statusText)) || res.statusText)
  }
  return res.json() as Promise<T>
}

export const api = {
  listJobs: () => request<JobSummary[]>('/api/jobs'),
  createJob: (name: string, prompt: string, type?: string) =>
    request<{ output: string; name: string }>('/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, prompt, type }),
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
    request<{ output: string }>(`/api/jobs/${encodeURIComponent(name)}/${action}`, { method: 'POST' }),
  previewUrl: (name: string, file: string) => `/previews/${encodeURIComponent(name)}/${encodeURIComponent(file)}`,
  downloadUrl: (name: string) => `/download/${encodeURIComponent(name)}`,
}
