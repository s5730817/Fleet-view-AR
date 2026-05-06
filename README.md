# Fleet View AR

Fleet View AR is a two-part app:

- `frontend/`: React + Vite client
- `backend/`: Express API

AR is launched from a bus detail page and is scoped to the selected bus.

## Requirements

- Node.js 20+
- npm 10+
- PostgreSQL 14+ if you want live database-backed data
- OpenSSL if you want HTTPS for phone/camera testing

## Install

```bash
cd backend
npm install

cd ../frontend
npm install
```

## Run In Mock Mode

Use this if you want to start the app without PostgreSQL.

1. Create the backend env file:

```bash
cd backend
cp .env.example .env
```

2. Set at least this value in `backend/.env`:

```dotenv
JWT_SECRET=replace_me
DATA_SOURCE=mock
```

3. Start the backend:

```bash
cd backend
npm run dev
```

4. Start the frontend in a second terminal:

```bash
cd frontend
npm run dev
```

5. Open the Vite URL shown in the frontend terminal.

## Run With PostgreSQL

Use this if you want live buses, issues, tools, assignments, and AR history stored in the database.

1. Create the local database and user:

```bash
sudo -u postgres psql
```

Inside `psql`:

```sql
CREATE ROLE admin WITH LOGIN PASSWORD 'admin-pgr-db77';
CREATE DATABASE fleetar OWNER admin;
\q
```

2. Create the backend env file:

```bash
cd backend
cp .env.example .env
```

3. Set these values in `backend/.env`:

```dotenv
PORT=5000
JWT_SECRET=replace_me
DATA_SOURCE=postgres
PGHOST=localhost
PGPORT=5432
PGDATABASE=fleetar
PGUSER=admin
PGPASSWORD=admin-pgr-db77
```

4. Apply the schema from the repo root:

```bash
PGPASSWORD=admin-pgr-db77 psql -h localhost -U admin -d fleetar -f database/db_pstgr.sql
```

5. Seed the demo data:

```bash
cd backend
npm run seed:postgres
```

6. Start the backend:

```bash
cd backend
npm run dev
```

7. Start the frontend in a second terminal:

```bash
cd frontend
npm run dev
```

## HTTPS For AR Testing

If you are testing AR on a phone or need camera access over HTTPS, use the HTTPS frontend mode.

1. Create a local CA once per machine in `frontend/`:

```bash
cd frontend
openssl genrsa -out ca.key 2048
openssl req -x509 -new -nodes -key ca.key -sha256 -days 3650 -out ca.crt -subj "/CN=Fleet View AR Dev CA"
```

2. Generate the dev server certificate:

```bash
cd frontend
npm run cert:dev
```

If you need LAN access, include your machine IP:

```bash
cd frontend
DEV_CERT_HOSTS=localhost,127.0.0.1,::1,<LAN-machine-IP> npm run cert:dev
```

3. Trust `frontend/ca.crt` on the device you are testing with.

4. Start the frontend over HTTPS:

```bash
cd frontend
npm run dev:https
```

## Demo Login Accounts

These accounts work in both mock mode and seeded PostgreSQL mode:

- `admin@test.com` / `password123`      - System Admin/office based
- `manager@test.com` / `password123`    - Maintanance Crew Manager/field+office based
- `tech1@test.com` / `password123`      - Tech/field based
- `tech2@test.com` / `password123`      - Tech/field based

## How To Use The App

1. Log in.
2. Open a bus from the fleet view.
3. Use the bus overview to inspect part status and history.
4. Launch AR from the bus detail page.
5. In manager mode, point at a bus-part marker and use `Report Issue`.
6. In mechanic mode, point at the same part to see the linked issue, guide, and required tools.

Any issue logged or updated in AR is reflected in the part history on the bus overview screen.

## Marker Ranges Used In Demo

- Bus-part markers use the shared `20-39` range on every bus
- Tool markers use the shared `500-520` range in every depot
- The `40-499` block is intentionally left empty as growth space so bus parts and tools do not intersect

### Bus part marker layout

Every bus reuses the same part marker IDs.

The unique identifier is:

- `bus license plate + marker id`

Current shared part markers:

- `20` Engine
- `21` Brakes
- `22` Tires
- `23` Battery
- `24` Suspension
- `25` Cooling System
- `26` Transmission
- `27` Electrical System

Formula:

`markerId = 20 + partIndex`

Examples:

- `BUS-4521 + 20` means Engine on Bus 1
- `BUS-4522 + 20` also means Engine, but on Bus 2
- `BUS-4521 + 25` means Cooling System on Bus 1
- `BUS-4538 + 27` means Electrical Systems on Bus 18

This keeps the physical marker set reusable across the fleet instead of consuming a new global marker block for every bus.

Current tool markers in each depot:

1. `500` Diagnostic Scanner
2. `501` Torque Wrench
3. `502` Wrench
4. `503` Drill
5. `504` Brake Caliper Tool
6. `505` Hydraulic Jack
7. `506` Battery Tester
8. `507` Coolant Pressure Tester
9. `508` Multimeter

See ./markers

### Indicator Logic

Fleet and part indicators are derived from live part condition, issue state, lifecycle state, and routine maintenance dates.

Bus status:

- `Good`: no component is blocking service and routine bus service is not overdue.
- `Requires Attention`: at least one component needs attention, or routine bus service is overdue, but no component is currently blocking service.
- `Out Of Operation`: at least one component is under repair, needs a fix or replacement, or needs replacement immediately.

Component status:

- `Good`: no blocking issues, not out of life, and no overdue component-specific inspection rule.
- `Requires Attention`: used for non-blocking risk such as overdue component inspection, open reports that do not force the part offline, or lifecycle drift that is not yet a hard stop.
- `Replacement Recommended`: the part is beyond expected life, but not yet in a blocking failure state.
- `Needs Fix or Replacement`: the part has a blocking condition state from active issues.
- `Needs Replacement!`: the part is both beyond expected life and in a blocking condition.
- `Under Repair`: there is an active issue already in `in_progress` or `awaiting_approval`.

Issue indicators:

- `No active issues`: no open issues are linked to the bus.
- `Needs a fix!`: there are active issues and at least one linked part is already in a blocking condition state.
- `Under repair`: at least one linked issue is in `in_progress` or `awaiting_approval`.

Routine maintenance indicators:

- `Routine unscheduled`: no next service date is set.
- `Routine due in N days`: next service date exists and is more than 7 days away.
- `Routine due today`: next service date is today.
- `Routine overdue`: next service date is in the past.

Component-specific maintenance indicators:

- These are only meaningful when a part has an inspection interval from lifecycle policy data.
- They are computed from `last_inspected_at + inspection_interval_days`.
- An overdue component inspection raises the component to `Requires Attention`, but does not by itself force the bus `Out Of Operation`.

Condition and lifecycle states used internally:

- Condition state is now `good`, `repair_needed`, or `replace_recommended`.
- Lifecycle state is `within_expected_life`, `near_end_of_life`, `beyond_expected_life`, or `beyond_life_approved`.
- The legacy `watch` condition state is no longer used. Older `watch` data is treated as `good`, and attention is now expressed through lifecycle, issue, or overdue-maintenance indicators instead.
