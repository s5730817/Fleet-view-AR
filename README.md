# Fleet-view-AR

Fleet View AR is maintained as a single repository that contains both frontend and backend code.

This repo intentionally does not use Git submodules. The original upstream projects are treated as read-only sources, and updates are imported into this repo through a repeatable sync script.

## Upstream Credits

- Original backend code source: https://github.com/Dom056/Tech-Innovations-Backend-Code
- Original frontend code source: https://github.com/SophisticatedOC/FrontEndCodeRelease

All credit for the base implementations belongs to the original creators. This repository contains integration work, fixes, and project-specific modifications.

## Project Structure

- `frontend/` - React + Vite client
- `backend/` - Node + Express API
- `scripts/sync-upstream.sh` - Pulls snapshots from upstream repos

## Local Setup

### Prerequisites

- Node.js 20+
- npm 10+
- git
- bash
- rsync

### Install and run backend

```bash
cd backend
npm install
npm run devStart
```

### Install and run frontend

```bash
cd frontend
npm install
npm run dev
```

For HTTPS frontend development instructions, see `frontend/README.md`.

## Upstream Sync Workflow

Use the sync script whenever you want to import newer code from one or both original repos.

### 1) Sync backend from upstream

```bash
bash scripts/sync-upstream.sh \
	--backend-url https://github.com/Dom056/Tech-Innovations-Backend-Code.git
```

Sync is non-destructive by default (local files missing upstream are kept).
Use `--delete-missing` only if you want strict mirror behavior.
To preview changes without writing files, add `--dry-run`.

Example dry run for both repos:

```bash
bash scripts/sync-upstream.sh \
	--backend-url https://github.com/Dom056/Tech-Innovations-Backend-Code.git \
	--frontend-url https://github.com/SophisticatedOC/FrontEndCodeRelease.git \
	--frontend-subdir website/website \
	--dry-run
```

### 2) Sync frontend from upstream (nested project path supported)

The frontend upstream repo currently uses nested folders, and the real app path is `website/website`.

```bash
bash scripts/sync-upstream.sh \
	--frontend-url https://github.com/SophisticatedOC/FrontEndCodeRelease.git \
	--frontend-subdir website/website
```

If their structure changes later and the project moves to repo root, you can omit `--frontend-subdir`.

### 3) Review and merge

After sync:

- Review `git status` and `git diff`.
- Resolve conflicts with your local changes.
- Run tests/build for frontend and backend.
- Commit with a message that includes the upstream repo and commit hash.

Example commit message:

```text
sync(frontend): import upstream FrontEndCodeRelease at <commit>
```

## Notes and Safety

- Never commit private keys or machine-local cert material.
- Upstream sync is copy-based, so your Git history remains clean in this repo.
- If a sync introduces breaking changes, revert that sync commit and retry with a smaller/manual merge.