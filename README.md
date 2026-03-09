# 3dEZ

Conversational 3D modeling tool. Describe what you want, get a printable CAD model.

Built with FastAPI + OCP (build123d/CadQuery) on the backend and Next.js + Three.js on the frontend.

## Prerequisites

- **Docker** and Docker Compose
- **Node.js 20+** (for local frontend dev)
- **Python 3.11+** (for local backend dev)

## Quickstart

```bash
make dev          # start backend + frontend in Docker
make dev-logs     # follow container logs
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
├── backend/          Python FastAPI app with OCP
│   └── src/app/      Application source (src layout)
├── frontend/         Next.js 16 with Three.js + Tailwind v4
│   └── src/          App Router pages and components
├── shared/           TypeScript API type definitions
├── docker-compose.yml
└── Makefile          Dev workflow shortcuts
```

## Development

| Command | Description |
|---|---|
| `make dev` | Start all services |
| `make dev-down` | Stop all services |
| `make dev-logs` | Follow logs |
| `make backend-shell` | Shell into backend container |
| `make frontend-shell` | Shell into frontend container |
| `make lint` | Run linters (ruff + eslint) |
| `make test` | Run test suites |
| `make build` | Build Docker images |
| `make clean` | Remove containers, volumes, caches |

## Architecture

- **Backend** serves a REST API at `/api/*` (FastAPI, Pydantic v2)
- **Frontend** proxies `/api/*` requests to the backend via Next.js rewrites
- **OCP** (OpenCascade) runs inside the backend Docker container for CAD operations
- Shared API types in `shared/api-types.ts` and `backend/src/app/models/api.py`
