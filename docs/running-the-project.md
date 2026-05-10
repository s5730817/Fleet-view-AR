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

Run this from `frontend/`:

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

If you want PostgreSQL-backed data, run these commands from the project root:

```bash
psql -h localhost -U admin -d fleetar -f database/db_pstgr.sql
cd backend
npm run seed:postgres
```

## 6. Restart After Changes

If you update the certificate or `.env` file, stop the app and run `npm run dev:https` again.
