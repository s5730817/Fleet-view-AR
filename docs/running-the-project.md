# Running the Project

This guide replaces the long setup section that used to live in the root README.

## Requirements

- Node.js 20+
- npm 10+
- PostgreSQL 14+ if you want the real database-backed mode
- OpenSSL if you want local HTTPS and camera/AR testing
- Bash for `frontend/scripts/generate-dev-cert.sh`

Windows note:

- `npm run cert:dev` calls a Bash script. Use Git Bash, WSL, or another environment that provides `bash` and `openssl`.

## Install Dependencies

### Linux and macOS

```bash
cd backend
npm install

cd ../frontend
npm install
```

### Windows PowerShell

```powershell
cd backend
npm install

cd ..\frontend
npm install
```

## Run in Mock Mode

Use mock mode when you want the UI and API without PostgreSQL.

### 1. Create `backend/.env`

Linux and macOS:

```bash
cd backend
cp .env.example .env
```

Windows PowerShell:

```powershell
cd backend
Copy-Item .env.example .env
```

### 2. Set at least these values

```dotenv
JWT_SECRET=replace_me
DATA_SOURCE=mock
```

### 3. Start the backend

```bash
cd backend
npm run dev
```

### 4. Start the frontend in a second terminal

```bash
cd frontend
npm run dev
```

### 5. Open the Vite URL shown in the frontend terminal

## Run with PostgreSQL

Use PostgreSQL mode when you want persistent buses, issues, jobs, assignments, notifications, and AR context backed by the local database.

### 1. Create the database role and database

#### Linux

```bash
sudo -u postgres psql
```

#### macOS

If PostgreSQL is installed through Homebrew or Postgres.app and `psql` is on your path:

```bash
psql postgres
```

#### Windows

```powershell
psql -U postgres
```

Inside `psql`:

```sql
CREATE ROLE admin WITH LOGIN PASSWORD 'admin-pgr-db77';
CREATE DATABASE fleetar OWNER admin;
\q
```

### 2. Create `backend/.env`

Linux and macOS:

```bash
cd backend
cp .env.example .env
```

Windows PowerShell:

```powershell
cd backend
Copy-Item .env.example .env
```

### 3. Set the backend database configuration

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

### 4. Apply the schema from the repository root

#### Linux and macOS

```bash
PGPASSWORD=admin-pgr-db77 psql -h localhost -U admin -d fleetar -f database/db_pstgr.sql
```

#### Windows PowerShell

```powershell
$env:PGPASSWORD = 'admin-pgr-db77'
psql -h localhost -U admin -d fleetar -f database/db_pstgr.sql
Remove-Item Env:PGPASSWORD
```

If `psql` prompts for a password, use `admin-pgr-db77`.

### 5. Seed demo data

```bash
cd backend
npm run seed:postgres
```

To reset and reseed:

```bash
cd backend
npm run reset:postgres
npm run seed:postgres
```

### 6. Start the backend

```bash
cd backend
npm run dev
```

### 7. Start the frontend in a second terminal

```bash
cd frontend
npm run dev
```

## HTTPS Certificate Setup

Use HTTPS when you need secure-origin browser features such as camera access and AR testing on another device.

### 1. Create the local CA once per machine

Run from `frontend/`.

```bash
openssl genrsa -out ca.key 2048
openssl req -x509 -new -nodes -key ca.key -sha256 -days 3650 -out ca.crt -subj "/CN=Fleet View AR Dev CA"
```

### 2. Generate the development certificate

```bash
npm run cert:dev
```

The script uses `frontend/ca.key` and `frontend/ca.crt`, then creates `frontend/certs/dev.crt` and `frontend/certs/dev.key`.

It auto-detects these hosts when possible:

- `localhost`
- `127.0.0.1`
- `::1`
- your detected LAN IP

You can override the host list:

```bash
DEV_CERT_HOSTS=localhost,127.0.0.1,::1,192.168.1.10 npm run cert:dev
```

### 3. Trust the CA on your machine

#### Windows

1. Press `Win + R`, run `certmgr.msc`.
2. Open `Trusted Root Certification Authorities` -> `Certificates`.
3. Import `frontend/ca.crt`.
4. Restart the browser.

#### macOS

1. Double-click `frontend/ca.crt`.
2. Open Keychain Access.
3. Find the imported certificate.
4. Expand `Trust` and set it to `Always Trust`.

#### Linux

Distribution steps vary. For browser-local testing, many teams simply import the CA into the browser profile. For system trust, use your distribution's certificate store workflow.

### 4. Start the frontend over HTTPS

```bash
cd frontend
npm run dev:https
```

Open `https://localhost:8080` or `https://<your-lan-ip>:8080`.

## LAN and Offline Workflow

The project supports a partial offline PWA workflow for depot users.

Important constraints:

- offline mode is intended for `manager` and `engineer`
- `admin` remains online-only
- the user must authenticate online on the same device before going offline
- the frontend caches the app shell and selected working-set data
- only selected writes are queued locally and synced later

### Same-machine offline preview

```bash
cd frontend
npm run preview:offline
```

Then:

1. Open `http://localhost:4173`.
2. Sign in online once.
3. Open the bus and data you want cached.
4. Disconnect and continue with the supported offline slice.

### Another device over LAN

1. Generate a certificate that includes the host machine's LAN IP.

```bash
cd frontend
DEV_CERT_HOSTS=localhost,127.0.0.1,::1,<LAN-machine-IP> npm run cert:dev
```

2. Trust `frontend/ca.crt` on the target phone or tablet.
3. Start the frontend in LAN HTTPS mode.

```bash
cd frontend
npm run dev:https:lan
```

4. Open `https://<LAN-machine-IP>:8080` on the device.
5. Sign in while online and preload the bus data you need.
6. Disconnect and use the supported offline workflow.

## Suggested Local Terminal Layout

- Terminal 1: `cd backend && npm run dev`
- Terminal 2: `cd frontend && npm run dev`
- Optional Terminal 3: `cd frontend && npm run preview:offline`
