import { useEffect, useState } from 'react'
import { api, type Manifest, type ManifestAsset } from './api'

export function tierLabel(tier: number | null): string | null {
  return tier === null ? null : `Tier ${tier}`
}

export function sizeLabel(size?: ManifestAsset['size_meters']): string | null {
  if (!size) return null
  const dims = [size.x, size.y, size.z].filter((n) => typeof n === 'number')
  return dims.length === 3 ? `${dims.join('×')} m` : null
}

export function costParts(cost?: ManifestAsset['cost']): string[] {
  if (!cost) return []
  const parts: string[] = []
  if (cost.metal_tons) parts.push(`${cost.metal_tons} t metal`)
  if (cost.cpus) parts.push(`${cost.cpus} cpu`)
  if (cost.battery_packs) parts.push(`${cost.battery_packs} batt`)
  if (cost.power_kw) parts.push(`${cost.power_kw} kW`)
  return parts
}

export function useManifest(): { manifest: Manifest | null; error: string | null } {
  const [manifest, setManifest] = useState<Manifest | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api
      .manifest()
      .then(setManifest)
      .catch((e) => setError(e.message))
  }, [])

  return { manifest, error }
}
