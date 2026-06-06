#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# setup-mac.sh — One-shot MacBook dev-workflow installer
#
# Installs: Homebrew, Docker Desktop, Ollama, uv/OpenHands, Tailscale
# Configures: GitHub SSH key, git identity, Ollama context length
#
# Usage:
#   chmod +x scripts/setup-mac.sh
#   ./scripts/setup-mac.sh [--model qwen2.5-coder:7b]
#
# Flags:
#   --model <name>   Ollama model to pull (default: auto-detected from RAM)
#   --no-docker      Skip Docker Desktop install (for uvx-only setup)
#   --skip-ssh       Skip SSH key generation (if you already have one)
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

# ── colours ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'
BOLD='\033[1m'; NC='\033[0m'

info()  { echo -e "${BLUE}[INFO]${NC}  $*"; }
ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*" >&2; }
step()  { echo -e "\n${BOLD}══ $* ══${NC}"; }

# ── flags ─────────────────────────────────────────────────────────────────────
CHOSEN_MODEL=""
SKIP_DOCKER=false
SKIP_SSH=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --model)    CHOSEN_MODEL="$2"; shift 2 ;;
    --no-docker) SKIP_DOCKER=true; shift ;;
    --skip-ssh) SKIP_SSH=true; shift ;;
    *) error "Unknown flag: $1"; exit 1 ;;
  esac
done

# ── OS check ─────────────────────────────────────────────────────────────────
if [[ "$(uname)" != "Darwin" ]]; then
  error "This script is for macOS only."
  exit 1
fi

# ── detect RAM and pick model ─────────────────────────────────────────────────
pick_model() {
  local ram_gb
  ram_gb=$(( $(sysctl -n hw.memsize) / 1073741824 ))
  info "Detected ${ram_gb} GB RAM"
  if [[ -z "$CHOSEN_MODEL" ]]; then
    if   (( ram_gb >= 32 )); then CHOSEN_MODEL="qwen3-coder:30b"
    elif (( ram_gb >= 16 )); then CHOSEN_MODEL="qwen2.5-coder:14b"
    else                          CHOSEN_MODEL="qwen2.5-coder:7b"
    fi
    info "Auto-selected model: ${CHOSEN_MODEL}"
    info "(Override with --model <name>)"
  fi
}

# ── Step 1: Homebrew ──────────────────────────────────────────────────────────
install_homebrew() {
  step "Step 1/6 — Homebrew"
  if command -v brew &>/dev/null; then
    ok "Homebrew already installed: $(brew --version | head -1)"
  else
    info "Installing Homebrew…"
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    # Add brew to PATH for Apple Silicon
    if [[ -f /opt/homebrew/bin/brew ]]; then
      eval "$(/opt/homebrew/bin/brew shellenv)"
      echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
    fi
    ok "Homebrew installed"
  fi
}

# ── Step 2: Docker Desktop ───────────────────────────────────────────────────
install_docker() {
  step "Step 2/6 — Docker Desktop"
  if $SKIP_DOCKER; then
    warn "Skipping Docker Desktop (--no-docker)"
    return
  fi
  if command -v docker &>/dev/null; then
    ok "Docker already installed: $(docker --version)"
  else
    info "Installing Docker Desktop via Homebrew…"
    brew install --cask docker
    ok "Docker Desktop installed — launch it from Applications to complete setup"
    warn "⚠  Open Docker Desktop now and wait until the menu-bar whale icon is steady"
    warn "   Then re-run this script or continue manually."
  fi
}

# ── Step 3: Ollama + model ────────────────────────────────────────────────────
install_ollama() {
  step "Step 3/6 — Ollama + ${CHOSEN_MODEL}"
  if command -v ollama &>/dev/null; then
    ok "Ollama already installed: $(ollama --version 2>/dev/null || echo 'version unknown')"
  else
    info "Installing Ollama via Homebrew…"
    brew install ollama
    ok "Ollama installed"
  fi

  # Set context length in shell profile
  local profile_file="$HOME/.zshrc"
  [[ -f "$HOME/.bash_profile" && ! -f "$HOME/.zshrc" ]] && profile_file="$HOME/.bash_profile"

  if ! grep -q "OLLAMA_CONTEXT_LENGTH" "$profile_file" 2>/dev/null; then
    echo 'export OLLAMA_CONTEXT_LENGTH=32768' >> "$profile_file"
    info "Added OLLAMA_CONTEXT_LENGTH=32768 to $profile_file"
  else
    ok "OLLAMA_CONTEXT_LENGTH already set in $profile_file"
  fi
  export OLLAMA_CONTEXT_LENGTH=32768

  # Start Ollama service
  if ! pgrep -x ollama &>/dev/null; then
    info "Starting Ollama service…"
    brew services start ollama
    sleep 3
  fi

  # Wait for Ollama to be ready
  local retries=10
  while ! curl -sf http://localhost:11434/api/tags &>/dev/null; do
    (( retries-- ))
    if (( retries == 0 )); then
      error "Ollama did not start within 30 seconds. Run: brew services restart ollama"
      exit 1
    fi
    sleep 3
  done
  ok "Ollama is running"

  # Pull the model if not already present
  if ollama list | grep -q "${CHOSEN_MODEL%%:*}"; then
    ok "Model ${CHOSEN_MODEL} already present"
  else
    info "Pulling ${CHOSEN_MODEL} (this may take 10–30 minutes)…"
    ollama pull "$CHOSEN_MODEL"
    ok "Model pulled: ${CHOSEN_MODEL}"
  fi
}

# ── Step 4: GitHub SSH ────────────────────────────────────────────────────────
configure_ssh() {
  step "Step 4/6 — GitHub SSH"

  if $SKIP_SSH; then
    warn "Skipping SSH key generation (--skip-ssh)"
    return
  fi

  local key_file="$HOME/.ssh/github_ed25519"

  if [[ -f "$key_file" ]]; then
    ok "SSH key already exists at $key_file"
  else
    info "Generating ed25519 SSH key…"
    read -r -p "  Enter your GitHub email [thatsdhatri@gmail.com]: " EMAIL
    EMAIL="${EMAIL:-thatsdhatri@gmail.com}"
    ssh-keygen -t ed25519 -C "$EMAIL" -f "$key_file" -N ""
    ok "SSH key generated"
  fi

  # Configure SSH client
  local ssh_config="$HOME/.ssh/config"
  if ! grep -q "Host github.com" "$ssh_config" 2>/dev/null; then
    cat >> "$ssh_config" <<EOF

Host github.com
  AddKeysToAgent yes
  UseKeychain yes
  IdentityFile $key_file
EOF
    chmod 600 "$ssh_config"
    ok "SSH config updated"
  fi

  # Start ssh-agent and add key
  eval "$(ssh-agent -s)" &>/dev/null
  ssh-add --apple-use-keychain "$key_file" 2>/dev/null || ssh-add "$key_file"

  # Show public key and instructions
  echo ""
  echo -e "${YELLOW}══ Add this public key to GitHub ══${NC}"
  cat "${key_file}.pub"
  echo ""
  echo "  1. Go to: https://github.com/settings/ssh/new"
  echo "  2. Title: MacBook $(hostname)"
  echo "  3. Paste the key above → Save"
  echo ""
  read -r -p "Press Enter after adding the key to GitHub…"

  # Test connection
  if ssh -o StrictHostKeyChecking=no -T git@github.com 2>&1 | grep -q "successfully authenticated"; then
    ok "GitHub SSH authentication works"
  else
    warn "SSH test returned unexpected output — verify manually: ssh -T git@github.com"
  fi

  # Git global identity
  if [[ -z "$(git config --global user.name 2>/dev/null)" ]]; then
    git config --global user.name "dhatsme"
    git config --global user.email "thatsdhatri@gmail.com"
    ok "Git identity configured"
  else
    ok "Git identity already set: $(git config --global user.name)"
  fi
}

# ── Step 5: uv / OpenHands ────────────────────────────────────────────────────
install_openhands() {
  step "Step 5/6 — OpenHands (via uvx)"

  if command -v uv &>/dev/null; then
    ok "uv already installed: $(uv --version)"
  else
    info "Installing uv…"
    curl -LsSf https://astral.sh/uv/install.sh | sh
    # shellcheck disable=SC1090
    source "$HOME/.local/bin/env" 2>/dev/null || true
    export PATH="$HOME/.local/bin:$PATH"
    ok "uv installed"
  fi

  # Add uv to shell profile if needed
  local profile_file="$HOME/.zshrc"
  if ! grep -q '\.local/bin' "$profile_file" 2>/dev/null; then
    echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$profile_file"
  fi

  # Pre-download OpenHands (speeds up first launch)
  info "Pre-caching OpenHands (first run — may take a minute)…"
  uvx --python 3.12 openhands --help &>/dev/null || true
  ok "OpenHands ready"

  # Create the launcher script
  ok "Use scripts/start-openhands.sh to launch OpenHands"
}

# ── Step 6: Tailscale ─────────────────────────────────────────────────────────
install_tailscale() {
  step "Step 6/6 — Tailscale"

  if command -v tailscale &>/dev/null; then
    ok "Tailscale already installed"
  else
    info "Installing Tailscale…"
    brew install --cask tailscale
    ok "Tailscale installed"
  fi

  echo ""
  echo "  Next steps for Tailscale:"
  echo "  1. Open Tailscale from Applications (or menu bar)"
  echo "  2. Sign in at https://tailscale.com (free account)"
  echo "  3. On your phone: install Tailscale from App Store / Play Store"
  echo "     and sign in with the same account"
  echo "  4. Run:  tailscale ip -4"
  echo "     → use that IP to open OpenHands from your phone:"
  echo "     http://<tailscale-ip>:3000"
  echo ""

  if tailscale ip -4 &>/dev/null 2>&1; then
    local ts_ip
    ts_ip=$(tailscale ip -4 2>/dev/null)
    ok "Tailscale IP: ${ts_ip}"
    info "OpenHands URL from phone: http://${ts_ip}:3000"
  else
    warn "Tailscale not yet connected — complete sign-in, then run: tailscale ip -4"
  fi
}

# ── Summary ───────────────────────────────────────────────────────────────────
print_summary() {
  step "Setup Complete"
  echo ""
  echo -e "  ${GREEN}✓${NC} Homebrew"
  $SKIP_DOCKER && echo -e "  ${YELLOW}–${NC} Docker Desktop (skipped)" \
               || echo -e "  ${GREEN}✓${NC} Docker Desktop"
  echo -e "  ${GREEN}✓${NC} Ollama + ${CHOSEN_MODEL}"
  $SKIP_SSH    && echo -e "  ${YELLOW}–${NC} GitHub SSH (skipped)" \
               || echo -e "  ${GREEN}✓${NC} GitHub SSH"
  echo -e "  ${GREEN}✓${NC} OpenHands (uvx)"
  echo -e "  ${GREEN}✓${NC} Tailscale"
  echo ""
  echo "  Next:"
  echo "   1. scripts/start-openhands.sh    ← start Ollama + OpenHands"
  echo "   2. scripts/validate-workflow.sh  ← verify everything works"
  echo "   3. Open http://localhost:3000 (or Tailscale IP from phone)"
  echo "   4. Configure LLM → Ollama / ${CHOSEN_MODEL} in the OpenHands UI"
  echo ""
}

# ── Main ──────────────────────────────────────────────────────────────────────
echo -e "${BOLD}MacBook Dev Workflow Installer${NC}"
echo "────────────────────────────────"

pick_model
install_homebrew
install_docker
install_ollama
configure_ssh
install_openhands
install_tailscale
print_summary
