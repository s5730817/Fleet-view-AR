#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TMP_DIR="$(mktemp -d)"

cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

BACKEND_URL=""
FRONTEND_URL=""
BACKEND_BRANCH="main"
FRONTEND_BRANCH="main"
FRONTEND_SUBDIR=""
DRY_RUN="0"
DELETE_MISSING="0"

usage() {
  cat <<'EOF'
Usage:
  bash scripts/sync-upstream.sh [options]

Options:
  --backend-url <url>         Backend upstream git URL
  --backend-branch <name>     Backend branch/tag to use (default: main)
  --frontend-url <url>        Frontend upstream git URL
  --frontend-branch <name>    Frontend branch/tag to use (default: main)
  --frontend-subdir <path>    Path to actual frontend project inside upstream repo
  --dry-run                   Show planned file changes without writing
  --delete-missing            Delete local files not present upstream
  --help                      Show this message

Examples:
  bash scripts/sync-upstream.sh \
    --backend-url https://github.com/example/backend.git

  bash scripts/sync-upstream.sh \
    --frontend-url https://github.com/example/frontend.git \
    --frontend-subdir app/web
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --backend-url)
      BACKEND_URL="${2:-}"
      shift 2
      ;;
    --backend-branch)
      BACKEND_BRANCH="${2:-}"
      shift 2
      ;;
    --frontend-url)
      FRONTEND_URL="${2:-}"
      shift 2
      ;;
    --frontend-branch)
      FRONTEND_BRANCH="${2:-}"
      shift 2
      ;;
    --frontend-subdir)
      FRONTEND_SUBDIR="${2:-}"
      shift 2
      ;;
    --dry-run)
      DRY_RUN="1"
      shift
      ;;
    --delete-missing)
      DELETE_MISSING="1"
      shift
      ;;
    --help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1"
      usage
      exit 1
      ;;
  esac
done

if [[ -z "$BACKEND_URL" && -z "$FRONTEND_URL" ]]; then
  echo "Nothing to sync. Provide --backend-url and/or --frontend-url"
  usage
  exit 1
fi

if [[ -n "$BACKEND_URL" ]]; then
  echo "==> Syncing backend from $BACKEND_URL ($BACKEND_BRANCH)"
  BACKEND_CLONE_DIR="$TMP_DIR/backend-src"
  git clone --depth 1 --branch "$BACKEND_BRANCH" "$BACKEND_URL" "$BACKEND_CLONE_DIR"

  RSYNC_FLAGS=(-a)
  if [[ "$DELETE_MISSING" == "1" ]]; then
    RSYNC_FLAGS+=(--delete)
  fi
  if [[ "$DRY_RUN" == "1" ]]; then
    RSYNC_FLAGS+=(--dry-run --itemize-changes)
    echo "Dry run enabled: backend files will not be modified"
  fi

  rsync "${RSYNC_FLAGS[@]}" \
    --exclude='.git' \
    --exclude='node_modules' \
    --exclude='.env' \
    --exclude='.env.*' \
    "$BACKEND_CLONE_DIR/" "$ROOT_DIR/backend/"

  BACKEND_COMMIT="$(git -C "$BACKEND_CLONE_DIR" rev-parse --short HEAD)"
  echo "Backend synced at upstream commit $BACKEND_COMMIT"
fi

if [[ -n "$FRONTEND_URL" ]]; then
  echo "==> Syncing frontend from $FRONTEND_URL ($FRONTEND_BRANCH)"
  FRONTEND_CLONE_DIR="$TMP_DIR/frontend-src"
  git clone --depth 1 --branch "$FRONTEND_BRANCH" "$FRONTEND_URL" "$FRONTEND_CLONE_DIR"

  FRONTEND_SOURCE_DIR="$FRONTEND_CLONE_DIR"
  if [[ -n "$FRONTEND_SUBDIR" ]]; then
    FRONTEND_SOURCE_DIR="$FRONTEND_CLONE_DIR/$FRONTEND_SUBDIR"
  fi

  if [[ ! -d "$FRONTEND_SOURCE_DIR" ]]; then
    echo "Frontend subdir not found: $FRONTEND_SOURCE_DIR"
    echo "Tip: inspect upstream repo tree and pass --frontend-subdir correctly"
    exit 1
  fi

  RSYNC_FLAGS=(-a)
  if [[ "$DELETE_MISSING" == "1" ]]; then
    RSYNC_FLAGS+=(--delete)
  fi
  if [[ "$DRY_RUN" == "1" ]]; then
    RSYNC_FLAGS+=(--dry-run --itemize-changes)
    echo "Dry run enabled: frontend files will not be modified"
  fi

  rsync "${RSYNC_FLAGS[@]}" \
    --exclude='.git' \
    --exclude='node_modules' \
    --exclude='.env' \
    --exclude='.env.*' \
    --exclude='ca.key' \
    --exclude='ca.crt' \
    --exclude='*.srl' \
    --exclude='certs' \
    "$FRONTEND_SOURCE_DIR/" "$ROOT_DIR/frontend/"

  FRONTEND_COMMIT="$(git -C "$FRONTEND_CLONE_DIR" rev-parse --short HEAD)"
  echo "Frontend synced at upstream commit $FRONTEND_COMMIT"
fi

if [[ "$DRY_RUN" == "1" ]]; then
  echo "==> Dry run completed. No files were changed."
else
  echo "==> Sync completed. Review changes with: git status && git diff"
fi

if [[ "$DELETE_MISSING" != "1" ]]; then
  echo "==> Non-destructive mode was used (no delete). Add --delete-missing for strict mirroring."
fi