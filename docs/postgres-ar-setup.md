# PostgreSQL and AR Notes

The detailed setup steps now live in the docs folder instead of the root README.

Use these files as the current sources of truth:

- [running-the-project.md](./running-the-project.md) for PostgreSQL setup, seeding, HTTPS certificates, LAN testing, and offline preview.
- [project-components.md](./project-components.md) for the AR/backend architecture split.
- [data-structures.md](./data-structures.md) for `BusARContext`, AR part payloads, tools, and issue templates.

Quick reminders:

- AR is bus-scoped and uses backend fleet endpoints such as `/api/fleet/:id/ar-context`.
- Local HTTPS is required for camera-based AR workflows on LAN devices.
- PostgreSQL mode uses `database/db_pstgr.sql` plus `npm run seed:postgres` in `backend/`.