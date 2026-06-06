#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# validate-workflow.sh — Check every component of the phone→AI→git workflow
#
# Usage:
#   ./scripts/validate-workflow.sh [--model qwen2.5-coder:7b]
#
# Exit code:
#   0 — all checks pass
#   1 — one or more checks failed
# ─────────────────────────────────────────────────────────────────────────────

set -uo pipefail

MODEL="${1:-}"

# ── colours ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'
BOLD='\033[1m'; NC='\033[0m'

PASS=0; FAIL=0; WARN=0

pass() { echo -e "${GREEN}  [PASS]${NC} $*"; (( PASS++ )); }
fail() { echo -e "${RED}  [FAIL]${NC} $*"; (( FAIL++ )); }
warn() { echo -e "${YELLOW}  [WARN]${NC} $*"; (( WARN++ )); }
section() { echo -e "\n${BOLD}$*${NC}"; }

# ── Helpers ───────────────────────────────────────────────────────────────────
cmd_exists() { command -v "$1" &>/dev/null; }
http_ok()    { curl -sf --max-time 5 "$1" &>/dev/null; }

# ─────────────────────────────────────────────────────────────────────────────
echo -e "${BOLD}Workflow Validation — $(date '+%Y-%m-%d %H:%M')${NC}"
echo "─────────────────────────────────────────────"

# ── 1. macOS tools ────────────────────────────────────────────────────────────
section "1. System tools"

cmd_exists brew   && pass "Homebrew installed"   || fail "Homebrew missing — see SETUP.md Step 1"
cmd_exists git    && pass "git installed: $(git --version)" || fail "git not found"
cmd_exists docker && pass "Docker CLI installed" || warn "Docker CLI not found — Docker method unavailable"
cmd_exists uv     && pass "uv installed: $(uv --version)" || warn "uv not found — install with: curl -LsSf https://astral.sh/uv/install.sh | sh"

# ── 2. Ollama ─────────────────────────────────────────────────────────────────
section "2. Ollama"

if cmd_exists ollama; then
  pass "Ollama binary found"
else
  fail "Ollama not installed — run: brew install ollama"
fi

if http_ok http://localhost:11434/api/tags; then
  pass "Ollama API responding at localhost:11434"

  MODELS=$(curl -sf http://localhost:11434/api/tags 2>/dev/null | python3 -c "
import sys, json
data = json.load(sys.stdin)
for m in data.get('models', []):
    print(m['name'])
" 2>/dev/null || echo "")

  if [[ -z "$MODELS" ]]; then
    fail "No models installed — run: ollama pull qwen3-coder:30b (or qwen2.5-coder:7b for 8GB RAM)"
  else
    pass "Models available:"
    while IFS= read -r m; do echo "       • $m"; done <<< "$MODELS"
  fi

  # Check context length
  CTX="${OLLAMA_CONTEXT_LENGTH:-}"
  if [[ -n "$CTX" ]] && (( CTX >= 22000 )); then
    pass "OLLAMA_CONTEXT_LENGTH=${CTX} (≥22000 required)"
  else
    warn "OLLAMA_CONTEXT_LENGTH=${CTX:-not set} — should be ≥22000. Add to ~/.zshrc:"
    warn "  export OLLAMA_CONTEXT_LENGTH=32768"
  fi
else
  fail "Ollama API not responding — run: brew services start ollama"
fi

# ── 3. GitHub SSH ─────────────────────────────────────────────────────────────
section "3. GitHub SSH"

if ls ~/.ssh/github_ed25519 ~/.ssh/id_ed25519 ~/.ssh/id_rsa &>/dev/null 2>&1; then
  pass "SSH key file found"
else
  fail "No SSH key found — run: ssh-keygen -t ed25519 -C thatsdhatri@gmail.com -f ~/.ssh/github_ed25519"
fi

SSH_RESULT=$(ssh -o StrictHostKeyChecking=no -o ConnectTimeout=5 -T git@github.com 2>&1 || true)
if echo "$SSH_RESULT" | grep -q "successfully authenticated"; then
  USER=$(echo "$SSH_RESULT" | grep -o 'Hi [^!]*' | cut -d' ' -f2)
  pass "GitHub SSH authentication OK (user: ${USER})"
else
  fail "GitHub SSH authentication failed — check your key is added to github.com/settings/keys"
  echo "       ssh -T git@github.com output: $SSH_RESULT"
fi

GIT_NAME=$(git config --global user.name 2>/dev/null || echo "")
GIT_EMAIL=$(git config --global user.email 2>/dev/null || echo "")
if [[ -n "$GIT_NAME" && -n "$GIT_EMAIL" ]]; then
  pass "git identity: ${GIT_NAME} <${GIT_EMAIL}>"
else
  warn "git identity not set — run:"
  warn "  git config --global user.name 'dhatsme'"
  warn "  git config --global user.email 'thatsdhatri@gmail.com'"
fi

# ── 4. Git remote ─────────────────────────────────────────────────────────────
section "4. Git remote (project)"

if [[ -d ".git" ]]; then
  REMOTE=$(git remote get-url origin 2>/dev/null || echo "")
  if echo "$REMOTE" | grep -q "git@github.com"; then
    pass "Remote uses SSH: $REMOTE"
  elif echo "$REMOTE" | grep -q "https://"; then
    warn "Remote uses HTTPS: $REMOTE"
    warn "  Switch to SSH: git remote set-url origin git@github.com:dhatsme/all_about_vlsi_verillog_gui.git"
  else
    fail "No git remote configured — run: git remote add origin git@github.com:dhatsme/all_about_vlsi_verillog_gui.git"
  fi
else
  warn "Not inside a git repository — clone the repo first:"
  warn "  git clone git@github.com:dhatsme/all_about_vlsi_verillog_gui.git"
fi

# ── 5. OpenHands ─────────────────────────────────────────────────────────────
section "5. OpenHands"

if http_ok http://localhost:3000; then
  pass "OpenHands web UI is running at localhost:3000"
else
  warn "OpenHands not running — start with: ./scripts/start-openhands.sh"
  warn "  (This is expected if you haven't started it yet)"
fi

# ── 6. Tailscale ─────────────────────────────────────────────────────────────
section "6. Tailscale"

if cmd_exists tailscale; then
  pass "Tailscale binary found"
  TS_IP=$(tailscale ip -4 2>/dev/null || echo "")
  if [[ -n "$TS_IP" ]]; then
    pass "Tailscale IP: ${TS_IP}"
    pass "Phone URL (when OpenHands is running): http://${TS_IP}:3000"
  else
    warn "Tailscale not connected — run: tailscale up"
  fi
else
  warn "Tailscale not installed — run: brew install --cask tailscale"
fi

# ── 7. End-to-end smoke test ──────────────────────────────────────────────────
section "7. End-to-end smoke test (Ollama inference)"

if http_ok http://localhost:11434/api/tags; then
  FIRST_MODEL=$(curl -sf http://localhost:11434/api/tags 2>/dev/null | \
    python3 -c "import sys,json; ms=json.load(sys.stdin).get('models',[]); print(ms[0]['name'] if ms else '')" 2>/dev/null || echo "")

  if [[ -n "$FIRST_MODEL" ]]; then
    info "  Testing inference with ${FIRST_MODEL}…"
    RESPONSE=$(curl -sf --max-time 30 http://localhost:11434/api/generate \
      -H "Content-Type: application/json" \
      -d "{\"model\":\"${FIRST_MODEL}\",\"prompt\":\"Reply with exactly: INFERENCE_OK\",\"stream\":false}" \
      2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('response','').strip())" 2>/dev/null || echo "")

    if [[ -n "$RESPONSE" ]]; then
      pass "Inference test passed — model responded"
    else
      fail "Inference test failed — no response from model (timeout or error)"
    fi
  fi
fi

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo "─────────────────────────────────────────────"
echo -e "  ${GREEN}PASS: ${PASS}${NC}   ${YELLOW}WARN: ${WARN}${NC}   ${RED}FAIL: ${FAIL}${NC}"
echo "─────────────────────────────────────────────"

if (( FAIL > 0 )); then
  echo -e "${RED}  Some checks failed. See SETUP.md for remediation steps.${NC}"
  exit 1
elif (( WARN > 0 )); then
  echo -e "${YELLOW}  Workflow functional with warnings. Review items above.${NC}"
  exit 0
else
  echo -e "${GREEN}  All checks passed — workflow is ready!${NC}"
  exit 0
fi
