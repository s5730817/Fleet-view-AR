# Main Components

## System Overview

Fleet View AR is split into a frontend client in `frontend/` and an API backend in `backend/`.

- The frontend is a React 18 + Vite application that handles login, dashboard views, bus detail workflows, AR, team views, notifications, and partial offline support.
- The backend is an Express 5 API that exposes auth, fleet, fault, job, summary, team, and notification endpoints.
- The runtime can use either mock services or PostgreSQL-backed services. The selection is made in `backend/src/services/index.js` from the configured data source.
- PostgreSQL schema setup lives in `database/db_pstgr.sql`.

## Frontend Client

The frontend entry point is `frontend/src/App.tsx`. It wires together several cross-cutting providers before mounting the routed application:

- `AccessibilityProvider`: user accessibility settings.
- `PermissionProvider`: role-aware UI decisions for `admin`, `manager`, and `engineer` users.
- `QueryClientProvider`: server-state caching and request coordination.
- `SyncStatusProvider`: online/offline state, queued operations, and offline working-set preparation.
- `TooltipProvider`, toast providers, and router setup.

### Main Pages

- `Login`: password + 2FA sign-in flow.
- `Index` (`/dashboard`): fleet dashboard and operational overview.
- `BusDetail` (`/bus/:id`): the main bus-scoped maintenance surface.
- `ARMode` (`/ar`): AR inspection and part/tool context.
- `MyJobs` (`/jobs`): engineer job list.
- `Summary` (`/summary`): aggregated operational metrics.
- `MaintenanceReports` (`/maintenance-reports`): maintenance logging workflows.
- `Team` (`/team`): team and staff visibility.
- `Notifications` (`/notifications`): derived alerts and unread/read state.
- `ToolTracker` (`/tool-tracker`): depot tool visibility.
- `Settings` and `DeviceSetup`: local preferences and device/certificate setup.

## Backend API

The backend entry point is `backend/src/app.js`.

- Global middleware includes CORS, Helmet, JSON parsing, request logging, and API-wide rate limiting.
- `POST /api/auth/login` validates credentials and starts 2FA.
- `POST /api/auth/verify-2fa` issues the JWT used by the rest of the API.
- All other API areas are protected by the auth middleware.

### Main API Areas

- `auth`: registration, login, 2FA verification, and device CA download.
- `fleet`: fleet list, bus detail, AR catalog, AR context/snapshot, and component maintenance history.
- `faults`: issue creation, filtering, status changes, and issue update history.
- `jobs`: user-scoped job lists.
- `summary`: dashboard summary metrics.
- `team`: staff and depot-related team data.
- `notifications`: derived notification feed and read-state actions.

## Data and Persistence

The project uses two backend modes:

- Mock mode: in-memory service implementations used for fast local development without PostgreSQL.
- PostgreSQL mode: `.real.js` services backed by the `pg` client and the local schema.

Important project behavior tied to the data layer:

- AR context is bus-scoped, not global.
- Marker codes are deterministic so the same bus parts and depot tools can be identified reliably in AR.
- Notification unread state is currently in-memory per authenticated user.
- Several frontend payload shapes are normalized through shared presentation helpers in `backend/src/services/fleetPresentation.shared.js` and `backend/src/services/notification.shared.js`.

## AR and Offline Support

AR is a first-class workflow rather than a standalone demo.

- The frontend stores AR runtime assets locally under `frontend/public/vendor`.
- The backend exposes `GET /api/fleet/:id/ar-context` and `GET /api/fleet/:id/ar-snapshot` to supply bus-scoped parts, issue types, assignable users, and depot tools.
- Offline support is intentionally partial. The app can cache an authenticated working set for `manager` and `engineer` sessions, queue selected writes, and sync them later.
- `admin` is online-only.

## Supporting Assets and Scripts

- `frontend/scripts/generate-dev-cert.sh`: generates local HTTPS dev certificates from an existing local CA.
- `backend/scripts/seed-postgres.js`: loads the deterministic demo data set.
- `backend/scripts/reset-postgres.js`: clears the seeded PostgreSQL data.
- `markers/`: printed or generated AR marker assets used by the AR workflow.
