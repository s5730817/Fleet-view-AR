# Welcome to a thing that hopefully works

## Thing info

! ORIGINAL BACKEND CODE IS TAKEN FROM https://github.com/Dom056/Tech-Innovations-Backend-Code !
! ORIGINAL FRONTEND CODE IS TAKEN FROM https://github.com/SophisticatedOC/FrontEndCodeRelease !

Note: Bun is required to local host view the webpage

To start up dev view run 'cd .\website' then 'bun run dev' in the terminal

This thing is mainly built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## HTTPS development certificate

This project can run Vite over HTTPS using a local CA and a server certificate.

Important:

- Do not commit private keys (`*.key`).
- Keep your local CA files (`ca.crt`, `ca.key`) machine-local.

### 1) Install dependencies

```bash
cd frontend
npm install
```

### 2) Create a local CA (one-time per machine)

Only run this if `ca.key` and `ca.crt` do not already exist.

```bash
openssl genrsa -out ca.key 2048
openssl req -x509 -new -nodes -key ca.key -sha256 -days 3650 -out ca.crt \
	-subj "/CN=Fleet View AR Dev CA"
```

### 3) Generate HTTPS server cert for Vite

Default hosts are `localhost,127.0.0.1,::1`:

```bash
npm run cert:dev
```

Generated files:

- `certs/dev.crt`
- `certs/dev.key`

If you use a phone or another machine over LAN, include your current LAN IP:

```bash
DEV_CERT_HOSTS=localhost,127.0.0.1,::1,192.168.0.109 npm run cert:dev
```

Replace `192.168.0.109` with your machine's current IP.

### 4) Trust the CA certificate on each device/browser

Use `ca.crt` as the trust anchor.

- Linux (system trust, Ubuntu/Debian style):

```bash
sudo cp ca.crt /usr/local/share/ca-certificates/fleet-view-ar-dev-ca.crt
sudo update-ca-certificates
```

- Android/iOS: install `ca.crt` as a user certificate (path varies by OS version).

### 5) Run HTTPS dev server

```bash
npm run dev:https
```

Expected URLs:

- `https://localhost:8080/`
- `https://<your-lan-ip>:8080/`

### 6) Troubleshooting

- Browser says certificate not trusted:
	- Ensure `ca.crt` is installed/trusted on that device.
	- Regenerate cert with the exact host/IP in `DEV_CERT_HOSTS`.

- HTTPS starts but phone cannot connect:
	- Confirm you are using `npm run dev:https` (host is `0.0.0.0`).
	- Confirm your firewall allows port `8080`.

- Need to refresh certificates:

```bash
rm -rf certs ca.srl
npm run cert:dev
```