# Fleet View AR

Fleet View AR is a fleet-maintenance application with a React + Vite frontend, an Express API backend, AR-assisted inspection flows, and an optional PostgreSQL-backed runtime.

Most project documentation now lives in the `docs/` folder. Start with the run guide:

- [docs/running-the-project.md](./docs/running-the-project.md): single-step HTTPS run instructions for Linux, macOS, and Windows.

## Quick Start

1. Install dependencies in `backend/` and `frontend/`.
2. Create or copy `backend/.env` and set `JWT_SECRET`.
3. In `frontend/`, create the local dev certificate with `npm run cert:dev`.
4. Start the app with `npm run dev:https`.
5. Open `https://localhost:8080`.

If you need the full setup or background details, see [docs/index.md](./docs/index.md).
