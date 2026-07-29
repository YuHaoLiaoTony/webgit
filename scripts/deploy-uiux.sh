#!/usr/bin/env bash
set -euo pipefail

# WebGit UIUX Deploy Script
# Deploys the Fork-style UI mockup (docs/uiux/) to public/
# The deployed UI will be served by the Express server at root (/)

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
UIUX_SRC="$ROOT_DIR/docs/uiux"
PUBLIC_DIR="$ROOT_DIR/public"
LEGACY_DIR="$PUBLIC_DIR/legacy"

echo "🚀 Deploying Fork UI Mockup (docs/uiux) → public/"
echo "  Source:   $UIUX_SRC"
echo "  Target:   $PUBLIC_DIR"
echo ""

# Step 1: Validate source exists
if [ ! -d "$UIUX_SRC" ]; then
  echo "❌ Error: Source directory not found: $UIUX_SRC"
  exit 1
fi

# Step 2: Preserve legacy backup
if [ -d "$LEGACY_DIR" ]; then
  echo "📦 Preserving legacy files in public/legacy/"
fi

# Step 3: Copy UIUX files to public/
echo "📋 Copying UIUX files..."
cp "$UIUX_SRC/index.html"     "$PUBLIC_DIR/index.html"
cp "$UIUX_SRC/styles.css"     "$PUBLIC_DIR/styles.css"
cp "$UIUX_SRC/app.js"         "$PUBLIC_DIR/app.js"
cp "$UIUX_SRC/changes-view.js" "$PUBLIC_DIR/changes-view.js"

# Step 4: Verify deployment
echo ""
echo "📄 Deployed files:"
ls -lh "$PUBLIC_DIR/index.html" "$PUBLIC_DIR/styles.css" "$PUBLIC_DIR/app.js" "$PUBLIC_DIR/changes-view.js"

echo ""
echo "✅ Deploy complete!"
echo "   Start server with: npm start"
echo "   Open browser at:   http://localhost:3000"
echo ""
echo "📌 Legacy UI still available at: /legacy/"
