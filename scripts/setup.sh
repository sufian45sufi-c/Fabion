#!/usr/bin/env bash
set -euo pipefail

echo ""
echo "  ◈  Fabion setup"
echo "  ─────────────────────────────────"
echo ""

# Check Node
node_version=$(node --version 2>/dev/null || echo "none")
if [[ "$node_version" == "none" ]]; then
  echo "  ✗ Node.js not found. Install Node 20+ first."
  exit 1
fi
echo "  ✓ Node: $node_version"

# Ensure pnpm
if ! command -v pnpm &>/dev/null; then
  echo "  → Installing pnpm..."
  npm install -g pnpm
fi
pnpm_version=$(pnpm --version)
echo "  ✓ pnpm: $pnpm_version"

# Install
echo "  → Installing dependencies..."
pnpm install

echo ""
echo "  ✓ Setup complete."
echo ""
echo "  Commands:"
echo "    pnpm dev:cli      — Run the Fabion CLI"
echo "    pnpm dev:desktop  — Run the Fabion Desktop (requires display)"
echo "    pnpm typecheck    — Check TypeScript"
echo ""
