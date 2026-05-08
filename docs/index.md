# Fleet View AR Documentation

This folder holds the project documentation that used to live in the root README.

## Start Here

- [running-the-project.md](./running-the-project.md): installation, mock mode, PostgreSQL mode, HTTPS certificates, LAN access, and offline preview instructions for Linux, macOS, and Windows.
- [project-components.md](./project-components.md): main system components and how the frontend, backend, database, and AR features fit together.
- [data-structures.md](./data-structures.md): core entities, status enums, and the main payload shapes shared across the app.
- [user-stories.md](./user-stories.md): role-based user stories and the main field workflows supported by the product.
- [postgres-ar-setup.md](./postgres-ar-setup.md): PostgreSQL and AR-specific notes with links back to the main run guide.

## Existing Project Areas

- `frontend/`: React + Vite client, offline shell, AR experience, and user-facing pages.
- `backend/`: Express API, authentication, role checks, business services, and mock/PostgreSQL data-source switching.
- `database/`: PostgreSQL schema file used for local development.
- `markers/`: AR marker assets.
