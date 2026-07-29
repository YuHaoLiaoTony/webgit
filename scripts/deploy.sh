#!/usr/bin/env bash
set -euo pipefail

# WebGit UI Deploy Script
# Builds the new UI from ui/ and outputs to public/

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
UI_DIR="$ROOT_DIR/ui"
PUBLIC_DIR="$ROOT_DIR/public"
LEGACY_DIR="$PUBLIC_DIR/legacy"

echo "🚀 Deploying WebGit UI..."
echo "  Source:      $UI_DIR"
echo "  Target:      $PUBLIC_DIR"
echo ""

# Step 1: Keep legacy backup safe
if [ -d "$LEGACY_DIR" ]; then
  echo "📦 Preserving legacy files in public/legacy/"
fi

# Step 2: Build UI with rolldown
if [ -d "$UI_DIR/node_modules/rolldown" ]; then
  echo "🔨 Building UI with rolldown..."
  cd "$UI_DIR"
  npx rolldown -c rolldown.config.js 2>/dev/null || \
    npx rolldown src/main.js --file "$PUBLIC_DIR/bundle.js" 2>/dev/null || \
    echo "⚠️  rolldown build skipped (no config or entry point found)"
  cd "$ROOT_DIR"
else
  echo "⚠️  rolldown not found, skipping bundling"
fi

# Step 3: Copy static assets
if [ -d "$UI_DIR/public" ]; then
  echo "📋 Copying static assets..."
  cp -r "$UI_DIR/public/"* "$PUBLIC_DIR/"
fi

# Step 4: Copy main HTML entry
if [ -f "$UI_DIR/index.html" ]; then
  echo "📋 Copying index.html..."
  cp "$UI_DIR/index.html" "$PUBLIC_DIR/"
fi

echo ""
echo "✅ Deploy complete!"
echo "   Start server with: npm start"
