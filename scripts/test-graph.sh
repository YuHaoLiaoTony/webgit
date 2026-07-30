#!/usr/bin/env bash
# scripts/test-graph.sh
#
# Generate graph demo HTML (16 scenarios including multi-branch merge).
# Usage: bash scripts/test-graph.sh
#
# To share the generated HTML, ask the Pi agent to run the share tool.

set -e
cd "$(dirname "$0")/.."

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

echo -e "${CYAN}${BOLD}═══════════════════════════════════════${NC}"
echo -e "${CYAN}${BOLD}  WebGit — Graph Demo Generator${NC}"
echo -e "${CYAN}${BOLD}═══════════════════════════════════════${NC}"
echo ""

# ── Generate the visual demo HTML ─────────────────────────────
echo -e "${BOLD}[1/1] Generating graph demo HTML (16 scenarios)...${NC}"
node tests/generate-graph-demo.js

HTML_PATH="tests/graph-lines-demo.html"
if [ -f "$HTML_PATH" ]; then
  SIZE=$(wc -c < "$HTML_PATH" | tr -d ' ')
  echo -e "${GREEN}✅ Generated: ${HTML_PATH} (${SIZE} bytes)${NC}"
else
  echo -e "${RED}❌ Failed to generate HTML${NC}"
  exit 1
fi

# ── Summary ────────────────────────────────────────────────────
echo ""
echo -e "${CYAN}${BOLD}═══════════════════════════════════════${NC}"
echo -e "${GREEN}${BOLD}  All done!${NC}"
echo -e "  - Demo ready: ${BOLD}open ${HTML_PATH}${NC}"
echo -e "  - To share:   tell the Pi agent to run:"
echo -e "    ${BOLD}mcp({ tool: 'workflow_share_file', args: { file_path: '$(pwd)/${HTML_PATH}' } })${NC}"
echo -e "${CYAN}${BOLD}═══════════════════════════════════════${NC}"
