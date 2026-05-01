#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CA_KEY="$ROOT_DIR/ca.key"
CA_CERT="$ROOT_DIR/ca.crt"
CERT_DIR="$ROOT_DIR/certs"
DEV_KEY="$CERT_DIR/dev.key"
DEV_CSR="$CERT_DIR/dev.csr"
DEV_CERT="$CERT_DIR/dev.crt"
OPENSSL_EXT="$CERT_DIR/dev.ext"

if [[ ! -f "$CA_KEY" || ! -f "$CA_CERT" ]]; then
  echo "Missing CA files. Expected: $CA_KEY and $CA_CERT"
  echo "Create/provide those first, then rerun npm run cert:dev"
  exit 1
fi

mkdir -p "$CERT_DIR"

HOSTS="${DEV_CERT_HOSTS:-localhost,127.0.0.1,::1}"
IFS=',' read -r -a host_list <<< "$HOSTS"

alt_names=""
idx=1
for host in "${host_list[@]}"; do
  clean_host="$(echo "$host" | xargs)"
  if [[ -z "$clean_host" ]]; then
    continue
  fi

  if [[ "$clean_host" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ || "$clean_host" == *":"* ]]; then
    alt_names+="IP.${idx} = ${clean_host}\n"
  else
    alt_names+="DNS.${idx} = ${clean_host}\n"
  fi
  idx=$((idx + 1))
done

if [[ -z "$alt_names" ]]; then
  echo "No valid hosts in DEV_CERT_HOSTS"
  exit 1
fi

cat > "$OPENSSL_EXT" <<EOF
authorityKeyIdentifier=keyid,issuer
basicConstraints=CA:FALSE
keyUsage = digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names
[alt_names]
$(printf "%b" "$alt_names")
EOF

openssl genrsa -out "$DEV_KEY" 2048
openssl req -new -key "$DEV_KEY" -out "$DEV_CSR" -subj "/CN=localhost"
openssl x509 -req -in "$DEV_CSR" -CA "$CA_CERT" -CAkey "$CA_KEY" -CAcreateserial -out "$DEV_CERT" -days 365 -sha256 -extfile "$OPENSSL_EXT"

rm -f "$DEV_CSR" "$OPENSSL_EXT"

echo "Generated dev certificate: $DEV_CERT"
echo "Generated dev key: $DEV_KEY"
echo "Hosts: $HOSTS"
