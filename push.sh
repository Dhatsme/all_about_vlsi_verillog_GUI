#!/bin/bash
# ─────────────────────────────────────────────
# push.sh — commit and push everything to GitHub
# Usage:
#   ./push.sh                  (uses a timestamp message)
#   ./push.sh "my message"     (custom commit message)
# ─────────────────────────────────────────────

set -e  # stop on any error

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$REPO_DIR"

MSG="${1:-update $(date '+%Y-%m-%d %H:%M')}"

echo "📂  $REPO_DIR"
echo "📝  Commit: $MSG"
echo ""

git add -A
git commit -m "$MSG" 2>/dev/null || echo "✓  Nothing new to commit."
git push origin main

echo ""
echo "✅  Done — pushed to GitHub."
