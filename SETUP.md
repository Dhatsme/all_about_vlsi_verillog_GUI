# MacBook Dev Workflow Setup Guide

**Goal:** Phone → OpenHands web UI → local Qwen AI model → file edits → git commit → git push to GitHub

**Status:** Follow each step in order. All steps are required.

---

## Architecture

```
📱 iPhone/Android
      │  Tailscale VPN (encrypted tunnel)
      ▼
🖥️  MacBook  ──────────────────────────────────────────────────────────
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │  OpenHands  (localhost:3000)                                      │ │
│  │  - Web UI for task input                                          │ │
│  │  - Runs AI agent loop                                             │ │
│  │  - Edits files in mounted workspace                              │ │
│  └───────────────────┬──────────────────────────────────────────────┘ │
│                       │ OpenAI-compatible API (port 11434)             │
│  ┌────────────────────▼────────────────────────────────────────────┐  │
│  │  Ollama  (localhost:11434)                                        │  │
│  │  - Serves qwen3-coder:30b (or qwen2.5-coder:14b/7b)             │  │
│  │  - Full GPU/Neural Engine acceleration on Apple Silicon          │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  📁 ~/projects/all_about_vlsi_verillog_GUI  (workspace)               │
│     ↕ git push via SSH → github.com                                   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Prerequisites

| Requirement | Minimum | Notes |
|---|---|---|
| macOS | Monterey 12.0 | Required for Tailscale |
| RAM | 8 GB | 16 GB+ recommended for better models |
| Storage | 20 GB free | Docker images + model weights |
| Apple Silicon | M1 or newer | Recommended; Intel Macs work but are slower |

---

## Step 1 — Install Homebrew

Homebrew is the package manager used for all subsequent installs.

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

After install, follow the "Next steps" printed on screen to add Homebrew to your PATH.
Verify with:

```bash
brew --version
```

---

## Step 2 — Install Docker Desktop

OpenHands runs its sandboxed agent inside Docker containers.

```bash
brew install --cask docker
```

After install, launch **Docker Desktop** from Applications. Wait until the Docker icon in the menu bar shows "Docker Desktop is running" (whale icon, not pulsing).

Verify:

```bash
docker --version
docker run hello-world
```

---

## Step 3 — Install Ollama + Qwen Coding Model

### 3a — Install Ollama

```bash
brew install ollama
```

Start the Ollama server (runs in the background):

```bash
ollama serve &
```

To start Ollama automatically at login:

```bash
brew services start ollama
```

### 3b — Choose and pull the right Qwen model

Pick based on your Mac's RAM:

| Your RAM | Recommended model | Pull command | Notes |
|---|---|---|---|
| 8 GB | `qwen2.5-coder:7b` | `ollama pull qwen2.5-coder:7b` | Fast; 6 GB on disk |
| 16 GB | `qwen2.5-coder:14b` | `ollama pull qwen2.5-coder:14b` | Good balance |
| 32 GB+ | `qwen3-coder:30b` | `ollama pull qwen3-coder:30b` | **Best agentic model** — 256K context, MoE architecture, built for coding agents |

**Recommendation for most MacBook Pros (M2/M3/M4 with 16–36 GB):** use `qwen3-coder:30b`. It uses a Mixture-of-Experts architecture so only 3.3B parameters are active per token — fast inference despite the large total size.

Pull your chosen model (this downloads several GB; allow 10–30 minutes):

```bash
# Replace with your chosen model:
ollama pull qwen3-coder:30b
```

### 3c — Set the context window

OpenHands requires a minimum 22,000-token context. The default Ollama context (4096) is too small:

```bash
# Add to ~/.zshrc or ~/.bash_profile:
echo 'export OLLAMA_CONTEXT_LENGTH=32768' >> ~/.zshrc
source ~/.zshrc
```

Restart Ollama after setting this:

```bash
brew services restart ollama
```

### 3d — Verify Ollama

```bash
ollama list           # should show your model
ollama run qwen3-coder:30b "Write a SystemVerilog D flip-flop"
```

---

## Step 4 — Configure GitHub SSH Authentication

### 4a — Generate a key

```bash
ssh-keygen -t ed25519 -C "thatsdhatri@gmail.com" -f ~/.ssh/github_ed25519
```

Press Enter twice to accept no passphrase (or set one for extra security).

### 4b — Add the key to macOS keychain

```bash
eval "$(ssh-agent -s)"
ssh-add --apple-use-keychain ~/.ssh/github_ed25519
```

Add to `~/.ssh/config` (create if missing):

```
Host github.com
  AddKeysToAgent yes
  UseKeychain yes
  IdentityFile ~/.ssh/github_ed25519
```

### 4c — Add the public key to GitHub

Copy the public key:

```bash
pbcopy < ~/.ssh/github_ed25519.pub
```

Go to **GitHub → Settings → SSH and GPG keys → New SSH key**, paste, and save.

### 4d — Test the connection

```bash
ssh -T git@github.com
# Expected: Hi dhatsme! You've successfully authenticated…
```

### 4e — Set your git identity

```bash
git config --global user.name  "dhatsme"
git config --global user.email "thatsdhatri@gmail.com"
```

### 4f — Clone the repo (if not already done)

```bash
mkdir -p ~/projects
cd ~/projects
git clone git@github.com:dhatsme/all_about_vlsi_verillog_gui.git
cd all_about_vlsi_verillog_gui
```

---

## Step 5 — Install and Configure OpenHands

OpenHands is the AI software agent. It reads tasks from its web UI, calls the local Qwen model, edits files in your project, and can run git commands.

### 5a — Install via uvx (recommended — no Docker complexity)

`uvx` is the fastest way to run OpenHands without managing Docker images manually.

Install `uv` (Python package runner):

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
source $HOME/.local/bin/env   # or restart your terminal
```

Run OpenHands (mount your project directory):

```bash
cd ~/projects/all_about_vlsi_verillog_gui
uvx --python 3.12 openhands serve --mount-cwd
```

The `--mount-cwd` flag mounts the current directory into the agent's workspace so it can read and write your files.

### 5b — Alternative: raw Docker command

Use this if uvx doesn't work or you prefer direct Docker control:

```bash
# Edit WORKSPACE to point at your project:
export WORKSPACE=~/projects/all_about_vlsi_verillog_gui

docker run -it --rm --pull=always \
  -e AGENT_SERVER_IMAGE_REPOSITORY=ghcr.io/openhands/agent-server \
  -e LOG_ALL_EVENTS=true \
  -e LLM_MODEL=ollama/qwen3-coder:30b \
  -e LLM_BASE_URL=http://host.docker.internal:11434 \
  -e LLM_API_KEY=ollama \
  -e WORKSPACE_MOUNT_PATH="$WORKSPACE" \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v ~/.openhands:/.openhands \
  -v "$WORKSPACE":/opt/workspace_base \
  -p 3000:3000 \
  --add-host host.docker.internal:host-gateway \
  --name openhands-app \
  docker.openhands.dev/openhands/openhands:latest
```

### 5c — Configure LLM inside the OpenHands web UI

1. Open `http://localhost:3000` in a browser
2. Click the **settings gear** icon
3. Set **LLM Provider** → `Ollama`
4. Set **Model** → `qwen3-coder:30b` (or whichever you pulled)
5. Set **Base URL** → `http://host.docker.internal:11434` (Docker method) or `http://localhost:11434` (uvx method)
6. **API Key** → `ollama` (literally the word "ollama")
7. Save

> **Tip:** The uvx method uses `http://localhost:11434` for the base URL. The Docker method must use `http://host.docker.internal:11434` because the container cannot reach the host's localhost directly.

### 5d — Configure git inside OpenHands

OpenHands needs SSH credentials to push to GitHub. Pass your SSH key into the session:

For the **uvx method**, OpenHands inherits your shell environment and `~/.ssh` automatically.

For the **Docker method**, add these flags to the `docker run` command:

```bash
-v ~/.ssh:/root/.ssh:ro \
-v ~/.gitconfig:/root/.gitconfig:ro \
```

---

## Step 6 — Install Tailscale (phone → MacBook access)

Tailscale creates an encrypted mesh VPN so your phone can reach your MacBook's OpenHands UI from anywhere — home, cafe, or on mobile data.

### 6a — Install on MacBook

```bash
brew install --cask tailscale
```

Open **System Preferences → Tailscale** (or launch from Applications) and sign in with your Tailscale account. Create a free account at [tailscale.com](https://tailscale.com) if you don't have one.

Enable Tailscale:

```bash
sudo tailscale up
```

Find your MacBook's Tailscale IP:

```bash
tailscale ip -4
# Example output: 100.88.14.23
```

### 6b — Install on iPhone / Android

- **iOS:** Download "Tailscale" from the App Store
- **Android:** Download "Tailscale" from the Play Store

Sign in with the **same account** you used on the MacBook.

### 6c — Access OpenHands from your phone

Once both devices show "Connected" in Tailscale:

1. Start OpenHands on your MacBook (Step 5a or 5b above)
2. On your phone, open a browser and navigate to:

```
http://<your-macbook-tailscale-ip>:3000
```

Replace `<your-macbook-tailscale-ip>` with the IP from `tailscale ip -4`.

> **Bookmark this URL** on your phone for quick access.

---

## Step 7 — Validate the Full Workflow

Run the validation script (see `scripts/validate-workflow.sh`), or follow the manual steps below.

### Manual validation

**Terminal on MacBook:**

```bash
# 1. Confirm Ollama is running and model is loaded
curl -s http://localhost:11434/api/tags | python3 -m json.tool | grep name

# 2. Confirm Docker is running
docker ps

# 3. Start OpenHands
cd ~/projects/all_about_vlsi_verillog_gui
uvx --python 3.12 openhands serve --mount-cwd
```

**In the OpenHands web UI (from phone or browser):**

```
Task: Create a file called hello_vlsi.sv with a simple SystemVerilog module
      that has a 1-bit input and 1-bit output, then git add, commit with
      message "test: workflow validation", and git push origin develop.
```

**Verify on GitHub:**

Go to `github.com/dhatsme/all_about_vlsi_verillog_gui/commits/develop` and confirm the commit appears.

**Clean up:**

```bash
rm -f hello_vlsi.sv
git push origin --delete develop  # only if you don't need this test branch
```

---

## Quick-Start Scripts

| Script | Purpose |
|---|---|
| `scripts/setup-mac.sh` | Automated one-shot installer — runs all steps above |
| `scripts/start-openhands.sh` | Starts Ollama + OpenHands with correct settings |
| `scripts/validate-workflow.sh` | Checks every component and reports pass/fail |

---

## Troubleshooting

### Ollama not responding

```bash
# Check if the process is running
pgrep -x ollama || echo "Not running"

# Restart
brew services restart ollama
sleep 3
curl http://localhost:11434/api/tags
```

### OpenHands can't reach Ollama (Docker method)

The Docker container uses `host.docker.internal` to reach the Mac's localhost.
Verify the flag `--add-host host.docker.internal:host-gateway` is in your docker run command.

Test from inside the container:

```bash
docker exec openhands-app curl -s http://host.docker.internal:11434/api/tags
```

### OpenHands context window error

If you see errors like "Prompt too long" or the agent loops without making progress:

```bash
# Ensure this is set before starting Ollama:
export OLLAMA_CONTEXT_LENGTH=32768
brew services restart ollama
```

### Phone can't reach MacBook on Tailscale

1. Both devices must be logged into the **same Tailscale account**
2. Check MacBook's firewall allows port 3000: **System Preferences → Security → Firewall → Options** → add an exception for OpenHands or disable the firewall temporarily
3. Verify: `tailscale status` should show both devices as "connected"

### git push permission denied

```bash
# Verify SSH key is loaded
ssh-add -l

# If empty, re-add:
ssh-add --apple-use-keychain ~/.ssh/github_ed25519

# Test connection
ssh -T git@github.com
```

### Wrong git remote (HTTPS instead of SSH)

```bash
# Switch to SSH remote:
git remote set-url origin git@github.com:dhatsme/all_about_vlsi_verillog_gui.git
git remote -v  # verify
```

---

## Model Selection Reference

| Model | RAM needed | Speed | Code quality | Best for |
|---|---|---|---|---|
| `qwen2.5-coder:7b` | ~6 GB | Fast | Good | 8 GB MacBooks |
| `qwen2.5-coder:14b` | ~10 GB | Medium | Very good | 16 GB MacBooks |
| `qwen2.5-coder:32b` | ~22 GB | Slow | Excellent | 32 GB+ MacBooks |
| `qwen3-coder:30b` | ~20 GB | Fast (MoE) | **Best** | 32 GB+ — recommended for agentic tasks |

`qwen3-coder:30b` is the preferred choice when RAM allows: it was designed specifically for agentic coding workflows with 256K context window and tool-use support.

---

*Last updated: 2026-06-06*
