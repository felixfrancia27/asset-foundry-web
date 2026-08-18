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
| GET | `/api/jobs` | list jobs |
| GET | `/api/jobs/:name` | job status + preview file list |
| POST | `/api/jobs/:name/review` | approve/reject a part |
| POST | `/api/jobs/:name/:action` | run a pipeline step (compose-building, render-previews, render-building, export) |
| GET | `/previews/:name/:file` | serve a preview image |
| GET | `/download/:name` | serve the deliverable zip |
