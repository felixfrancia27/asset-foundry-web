# Asset Foundry Web

Web UI for the [Asset Foundry](https://github.com/felixfrancia27/asset-foundry) asset pipeline.

A React + TypeScript SPA plus a thin Express backend that wraps the Asset Foundry CLI (`python -m asset_foundry`).

## Stack

- **Frontend**: Vite + React + TypeScript
- **Backend**: Express (TypeScript, run with `tsx`) that shells out to the CLI and serves preview images / deliverable zips
- **Theme**: the "Foundry" look — dark steel + molten amber (see `src/theme.css`)

## Requirements

- Node.js 20+
- Python 3.11+ with the `asset-foundry` repo available

The backend runs the CLI from `../asset-foundry` by default. Override with `ASSET_FOUNDRY_DIR`:

```bash
ASSET_FOUNDRY_DIR=/path/to/asset-foundry npm run dev
```

## Development

```bash
npm install
npm run dev
```

This starts:

- the Vite dev server on `http://localhost:5173`
- the backend on `http://localhost:3001` (the Vite dev server proxies `/api`, `/previews`, and `/download` to it)

## Scripts

- `npm run dev` — run backend + frontend together
- `npm run dev:server` — backend only
- `npm run dev:web` — frontend only
- `npm run build` — typecheck + production build
- `npm run lint` — oxlint

## API

| Method | Path | Description |
| ------ | ---- | ----------- |
| GET | `/api/health` | liveness + resolved asset-foundry dir |
| GET | `/api/manifest` | the lunar-RTS roster (JSON) |
| GET | `/api/jobs` | list jobs |
| POST | `/api/jobs` | forge a job (`prompt`/`type`, or `manifest_id` from the roster) |
| DELETE | `/api/jobs/:name` | delete a job + its export |
| GET | `/api/jobs/:name` | job status + design metadata + preview/rendered file list |
| POST | `/api/jobs/:name/review` | approve/reject a part |
| POST | `/api/jobs/:name/refine` | run the agent refine loop (`rounds`) |
| GET | `/api/jobs/:name/refine-status` | refine progress + features |
| POST | `/api/jobs/:name/:action` | run a pipeline step (compose, render-*, export) |
| GET | `/api/jobs/:name/:action/status` | step progress |
| GET | `/previews/:name/:file` | serve a preview image |
| GET | `/work/:name/:file` | serve a work image (renders, snapshots) |
| GET | `/download/:name` | serve the deliverable zip |

## Pages

- **Forge** (`/`) — the composer + a 3-step how-it-works + recent models.
- **Roster** (`/roster`) — the lunar-RTS catalog (category tabs, tier, part
  groups, size/cost, upgrade chains), forge-from-roster.
- **Models** (`/models`) — all jobs with type/status filters and delete.
- **Job** (`/jobs/:name`) — design metadata, a prominent **Refine** panel with a
  rounds selector and before/after snapshots, live pipeline progress, and
  side-by-side rendered output.
