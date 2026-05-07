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
#linux
sudo -u postgres psql
#windows 
psql -U postgres
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
#linux
PGPASSWORD=admin-pgr-db77 psql -h localhost -U admin -d fleetar -f database/db_pstgr.sql

#windows
psql -h localhost -U admin -d fleetar -f database/db_pstgr.sql

#password may not show in terminal, copy, paste and enter.
admin-pgr-db77
```

5. Seed the demo data:

```bash
cd backend
npm run seed:postgres
```

This seed now loads both the baseline mock-backed fleet data and a deterministic showcase dataset for demos.

If you want to wipe the demo dataset and start fresh before reseeding:

```bash
cd backend
npm run reset:postgres
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

## HTTPS Certificate Setup

### 1. Create the CA (once per machine)

Run from the `frontend/` directory:

```bash
openssl genrsa -out ca.key 2048
openssl req -x509 -new -nodes -key ca.key -sha256 -days 3650 -out ca.crt -subj "/CN=Fleet View AR Dev CA"
```

### 2. Generate the dev certificate

```bash
npm run cert:dev
```

This auto-detects your LAN IP and generates a certificate for:
- `localhost`
- `127.0.0.1`
- `::1`
- Your LAN IP (e.g. `192.168.1.x`)

### 3. Trust the CA on your machine

**Windows:**
1. Press `Win + R`, type `certmgr.msc`, hit Enter
2. Go to **Trusted Root Certification Authorities** → **Certificates**
3. Right click → **All Tasks** → **Import**
4. Browse to `frontend/ca.crt` and import it
5. Restart Chrome

**Mac:**
1. Double click `frontend/ca.crt`
2. Open Keychain Access
3. Find the cert, double click it
4. Expand **Trust** and set to **Always Trust**

### 4. Start the frontend over HTTPS

```bash
npm run dev:https
```

Access the app at `https://localhost:8080` or `https://<your-LAN-IP>:8080`

### Trusting on Android (for AR testing)

1. Copy `frontend/ca.crt` to your phone via google drive
2. Go to **Settings** → **Security** → **Install a certificate** → **CA Certificate**
3. Select `ca.crt` and install it
4. Access via `https://<your-LAN-IP>:8080` in Chrome

## Partial Offline Mode

The app now supports a first partial-offline PWA slice for depot use.

- Offline mode is intended only for `manager` and `engineer` sessions that have already authenticated online on that device.
- `admin` remains online-only.
- Cached reads are available for already-synced fleet, bus detail, jobs, summary, and AR context data.
- Offline-safe writes are queued locally and synced later: issue creation, comment updates, selected status progression, maintenance logs, and AR part approval.
- Actions that require fresh server truth should fail fast with `Offline, can not proceed`.

Current offline session behavior:

- The user must have logged in online recently on the same device.
- The frontend keeps a short-lived offline session marker locally for manager/engineer roles.
- If the app is offline and that local depot session is still valid, the app can reopen without contacting the backend.

Current runtime dependency policy:

- AR runtime assets are bundled locally from `frontend/public/vendor`.
- The app shell is cached by the service worker.
- No CDN fonts are required anymore for the app shell to render offline.

## LAN To Offline Workflow

If you want to connect from another device over LAN once, then continue with offline field functionality, use this flow.

Important constraints:

- If the device is another phone or tablet on your Wi-Fi, offline reads, queued writes, and AR only work after that device has loaded the app from a secure origin.
- For `localhost`, plain HTTP is treated as secure by the browser. For a LAN IP such as `192.168.x.x`, you must use HTTPS and the device must trust your local CA certificate.
- If you switch Wi-Fi off completely after preload, the app can keep working only for the already-cached app shell, data, and allowed offline actions.
- `admin` remains online-only. Offline mode is intended for `manager` and `engineer`.

### Same machine testing

If you are testing on the same machine that runs the frontend:

```bash
cd frontend
npm run preview:offline
```

Open `http://localhost:4173`, sign in online once, open the bus data you need, then disconnect.

### Another device over LAN

1. Generate a dev certificate that includes your machine's LAN IP:

```bash
cd frontend
DEV_CERT_HOSTS=localhost,127.0.0.1,::1,<LAN-machine-IP> npm run cert:dev
```

2. Install and trust `frontend/ca.crt` on the phone/tablet that will use the app.

3. Start the frontend in LAN HTTPS mode:

```bash
cd frontend
npm run dev:https:lan
```

4. Start the backend so the frontend can reach `http://<server-ip>:5000` or your configured API URL.

5. On the device, open:

```text
https://<LAN-machine-IP>:8080
```

6. While still online on that LAN:

- log in as `manager` or `tech`
- wait for the dashboard to finish loading
- open the buses you need for the session
- open AR for the bus you want if you plan to use AR offline

7. After that preload step, you can disconnect from Wi-Fi and continue using the offline-safe parts of the app.

### What should work after disconnecting

- fleet overview for the visible depot scope
- bus detail for cached buses
- jobs list
- summary data
- AR for buses whose AR context was cached during preload
- offline-safe queued actions such as issue logging, comments, status progression, maintenance logs, and AR approval/fix flows

### What will not work offline

- login on a fresh device that has never authenticated online
- admin workflows
- actions that require fresh server truth and are intentionally blocked with `Offline, can not proceed`
- buses or AR contexts that were never cached on that device before disconnecting

## Demo Login Accounts

These accounts work in both mock mode and seeded PostgreSQL mode:

- `admin@test.com` / `password123`      - System Admin/office based
- `manager@test.com` / `password123`    - Maintanance Crew Manager/field+office based
- `tech1@test.com` / `password123`      - Tech/field based
- `tech2@test.com` / `password123`      - Tech/field based

## Showcase Demo Cases

The PostgreSQL seed includes dedicated showcase buses with predictable registrations so you can demonstrate each workflow quickly:

- `DMO-100` `Showcase Good`: healthy bus, routine service on schedule, no active issues.
- `DMO-101` `Showcase Open Reports`: non-blocking open report, near-end-of-life component, and routine service due soon.
- `DMO-102` `Showcase Approval`: component maintenance due today/overdue with no issue, so AR `Approve` can reset the part.
- `DMO-103` `Showcase Routine Overdue`: bus-level routine service overdue while components remain otherwise healthy.
- `DMO-104` `Showcase Blocking Faults`: active blocking reported faults that drive `Needs a fix!` and put the bus out of operation.
- `DMO-105` `Showcase Under Repair`: in-progress and awaiting-approval repairs, plus a replacement-needed tyre case.
- `DMO-106` `Showcase Unscheduled Lifecycle`: routine maintenance unscheduled and parts beyond life / beyond-life-approved.

The same seed also marks a few depot tools as `in_use` or `awaiting_return` so tool-tracking states are visible in AR demos.

## Demo Route

If you need a compact presenter flow, use this order:

1. Log in as `manager@test.com` and open `DMO-100` to show the clean baseline state.
2. Open `DMO-101` to show non-blocking open reports, near-end-of-life attention, and due-soon maintenance.
3. Open `DMO-102`, launch AR as `tech1@test.com`, and use `Approve` on the due part to show maintenance reset without creating an issue.
4. Open `DMO-103` to show that routine bus service alone can move the vehicle to `Requires Attention`.
5. Open `DMO-104` to show blocking reported faults and why the bus is out of operation.
6. Open `DMO-105`, then switch to `tech2@test.com` in AR to show `Fix`, `Under Repair`, `Awaiting Approval`, and replacement-needed scenarios.
7. Open `DMO-106` to show `Routine unscheduled`, `beyond_expected_life`, and `beyond_life_approved` lifecycle cases.

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
