#!/usr/bin/env bash
set -euo pipefail

# WebGit Deploy Script
# Builds the Vue UI (ui/) and outputs to public/
# Backend (src/) is Node.js code that runs directly (no build step needed).
#
# Usage:
#   ./scripts/deploy.sh              # build & deploy
#   ./scripts/deploy.sh --skip-build # skip Vite build, copy existing dist/

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
UI_DIR="$ROOT_DIR/ui"
UI_DIST="$UI_DIR/dist"
PUBLIC_DIR="$ROOT_DIR/public"
LEGACY_DIR="$PUBLIC_DIR/legacy"

SKIP_BUILD=false
if [ "${1:-}" = "--skip-build" ]; then
  SKIP_BUILD=true
fi

echo "🚀 Deploying WebGit..."
echo "  UI source:  $UI_DIR"
echo "  UI dist:    $UI_DIST"
echo "  Target:     $PUBLIC_DIR"
echo ""

# ── Step 1: Build Vue UI with Vite ──
if [ "$SKIP_BUILD" = false ]; then
  echo "🔨 Building Vue UI with Vite..."
  cd "$UI_DIR"
  npx vite build
  cd "$ROOT_DIR"
  echo ""
else
  echo "⏭️  Skipping Vite build (using existing $UI_DIST)"
fi

# Validate dist exists
if [ ! -d "$UI_DIST" ]; then
  echo "❌ Error: Build output not found at $UI_DIST"
  echo "   Run without --skip-build to build first."
  exit 1
fi

# ── Step 2: Backup legacy directory ──
if [ -d "$LEGACY_DIR" ]; then
  LEGACY_BACKUP=$(mktemp -d)/legacy
  echo "📦 Backing up legacy files..."
  cp -r "$LEGACY_DIR" "$LEGACY_BACKUP"
fi

# ── Step 3: Deploy built UI to public/ ──
echo "📋 Deploying UI to $PUBLIC_DIR ..."

# Remove old files (keep legacy backup safe)
rm -rf "$PUBLIC_DIR"/index.html "$PUBLIC_DIR"/assets 2>/dev/null || true

# Copy built files
cp -r "$UI_DIST"/* "$PUBLIC_DIR/"

# ── Step 4: Restore legacy directory ──
if [ -d "${LEGACY_BACKUP:-}" ]; then
  echo "📦 Restoring legacy files..."
  rm -rf "$LEGACY_DIR" 2>/dev/null || true
  cp -r "$LEGACY_BACKUP" "$LEGACY_DIR"
fi

# ── Done ──
echo ""
echo "✅ Deploy complete!"
echo "   Start server:  npm start"
echo "   Open browser:  http://localhost:3000"
echo "   Legacy UI:     http://localhost:3000/legacy/"
echo ""
echo "📄 Deployed files:"
ls -lh "$PUBLIC_DIR/index.html" "$PUBLIC_DIR/assets/"*.js "$PUBLIC_DIR/assets/"*.css 2>/dev/null
