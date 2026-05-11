# Run the App

Use this one path for macOS, Linux, and Windows.

## What You Need

- Node.js 20 or newer
- npm 10 or newer
- `bash` and `openssl`

On Windows, use Git Bash or WSL so `bash` and `openssl` are available.

## 1. Install Dependencies

Run these commands from the project root:

```bash
cd backend
npm install

cd ../frontend
npm install
```

## 2. Set the Backend Environment

Create `backend/.env` from `backend/.env.example` and set at least:

```dotenv
JWT_SECRET=replace_me
DATA_SOURCE=postgres
PGHOST=localhost
PGPORT=5432
PGDATABASE=fleetar
PGUSER=admin
PGPASSWORD=admin-pgr-db77
```

## 3. Create the Local HTTPS Certificate

`npm run cert:dev` requires a local CA key and certificate to already exist at `frontend/ca.key` and `frontend/ca.crt`. These are not committed to the repo and must be generated once:

```bash
cd frontend
openssl genrsa -out ca.key 4096
openssl req -x509 -new -nodes -key ca.key -sha256 -days 1825 -out ca.crt -subj "/CN=Fleet-View-AR Local CA"
```

Then run the cert script from `frontend/`:

```bash
npm run cert:dev
```

This creates the development certificate used by `npm run dev:https`.

## 4. Start the App

Run this from `frontend/`:

```bash
npm run dev:https
```

Open:

```text
https://localhost:8080
```

If you want to open the app from another device on the same network, use the machine's LAN IP instead of `localhost`.

## 5. Optional Database Setup

Before applying the schema, the PostgreSQL role and database must exist. On a fresh install, create them as the `postgres` superuser:

```bash
sudo -u postgres psql -c "CREATE ROLE admin WITH LOGIN PASSWORD 'admin-pgr-db77';"
sudo -u postgres psql -c "CREATE DATABASE fleetar OWNER admin;"
```

Then apply the schema and seed from the project root:

```bash
psql -h localhost -U admin -d fleetar -f database/db_pstgr.sql
cd backend
npm run seed:postgres
```

> **Note:** `database/db_pstgr.sql` uses plain `CREATE TABLE` statements without `IF NOT EXISTS`. Running it against an already-initialised database will print errors for each existing table but will still apply indexes and constraints correctly. The errors are safe to ignore on repeat runs.

## 6. Restart After Changes

If you update the certificate or `.env` file, stop the app and run `npm run dev:https` again.
