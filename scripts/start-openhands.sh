#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# start-openhands.sh — Launch Ollama + OpenHands with correct settings
#
# Usage (from project root):
#   ./scripts/start-openhands.sh [--model qwen3-coder:30b] [--port 3000]
#
# What it does:
#   1. Ensures Ollama is running with the correct context length
#   2. Launches OpenHands (uvx method) bound to all interfaces so Tailscale can reach it
#   3. Prints the local and Tailscale URLs
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

# ── defaults ──────────────────────────────────────────────────────────────────
MODEL="${OPENHANDS_MODEL:-qwen3-coder:30b}"
PORT="${OPENHANDS_PORT:-3000}"
CONTEXT="${OLLAMA_CONTEXT_LENGTH:-32768}"
WORKSPACE="$(pwd)"

# ── flags ─────────────────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --model) MODEL="$2"; shift 2 ;;
    --port)  PORT="$2";  shift 2 ;;
    *) echo "Unknown flag: $1" >&2; exit 1 ;;
  esac
done

# ── colours ───────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; BOLD='\033[1m'; NC='\033[0m'
info() { echo -e "${BLUE}[INFO]${NC}  $*"; }
ok()   { echo -e "${GREEN}[OK]${NC}    $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC}  $*"; }

# ── 1. Ensure Ollama is running ───────────────────────────────────────────────
export OLLAMA_CONTEXT_LENGTH="$CONTEXT"

if ! pgrep -x ollama &>/dev/null; then
  info "Starting Ollama (context length: ${CONTEXT})…"
  if command -v brew &>/dev/null; then
    OLLAMA_CONTEXT_LENGTH="$CONTEXT" brew services start ollama
  else
    OLLAMA_CONTEXT_LENGTH="$CONTEXT" ollama serve &>/dev/null &
  fi
  sleep 3
fi

# Wait for Ollama to accept requests
info "Waiting for Ollama…"
for i in {1..10}; do
  curl -sf http://localhost:11434/api/tags &>/dev/null && break
  sleep 2
done

if ! curl -sf http://localhost:11434/api/tags &>/dev/null; then
  echo "ERROR: Ollama did not start. Run: brew services restart ollama" >&2
  exit 1
fi
ok "Ollama running at http://localhost:11434"

# Check that the model is present
if ! ollama list 2>/dev/null | grep -q "${MODEL%%:*}"; then
  info "Model ${MODEL} not found — pulling now (this may take a while)…"
  ollama pull "$MODEL"
fi
ok "Model ready: ${MODEL}"

# ── 2. Print access URLs ──────────────────────────────────────────────────────
LOCAL_URL="http://localhost:${PORT}"
TS_IP=$(tailscale ip -4 2>/dev/null || echo "")

echo ""
echo -e "${BOLD}── OpenHands URLs ──────────────────────────────────${NC}"
echo -e "  Local browser:   ${GREEN}${LOCAL_URL}${NC}"
if [[ -n "$TS_IP" ]]; then
  echo -e "  Phone (Tailscale): ${GREEN}http://${TS_IP}:${PORT}${NC}"
else
  warn "Tailscale not connected — run 'tailscale up' for phone access"
fi
echo ""
echo -e "${BOLD}── LLM Settings to enter in OpenHands UI ──────────${NC}"
echo "  Provider:  Ollama"
echo "  Model:     $MODEL"
echo "  Base URL:  http://localhost:11434"
echo "  API Key:   ollama"
echo ""
echo -e "${BOLD}── Workspace ───────────────────────────────────────${NC}"
echo "  $WORKSPACE"
echo ""

# ── 3. Launch OpenHands ───────────────────────────────────────────────────────
info "Starting OpenHands on port ${PORT} (workspace: ${WORKSPACE})…"
info "Press Ctrl+C to stop."
echo ""

# uvx method: mounts current directory, binds to all interfaces for Tailscale
exec uvx --python 3.12 openhands serve \
  --mount-cwd \
  --host 0.0.0.0 \
  --port "$PORT" 2>&1 | sed "s|^|[OpenHands] |"
