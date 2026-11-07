#!/usr/bin/env bash
# Run all checks for index.html: inline-script syntax, then every Playwright scenario
# in playwright-scenarios/ (desktop + phone) via the verify-webpage Claude skill.
# Prints only failures and the final tally. Exit code is non-zero if anything failed.
set -uo pipefail
cd "$(dirname "$0")/.."

VERIFY="$HOME/.claude/skills/verify-webpage/scripts/verify.mjs"
if [ ! -f "$VERIFY" ]; then
  echo "verify-webpage skill not found at $VERIFY (see CLAUDE.md)" >&2
  exit 2
fi

tmp="$(mktemp --suffix=.js)"
trap 'rm -f "$tmp"' EXIT

# 1. Syntax check of the last inline <script> in index.html
node -e '
  const fs = require("fs");
  const scripts = [...fs.readFileSync("index.html", "utf8").matchAll(/<script>([\s\S]*?)<\/script>/g)];
  if (!scripts.length) { console.error("no inline <script> found"); process.exit(1); }
  fs.writeFileSync(process.argv[1], scripts[scripts.length - 1][1]);
' "$tmp" || exit 1
if ! node --check "$tmp"; then
  echo "FAIL  inline script has a syntax error"
  exit 1
fi
echo "ok    inline script syntax"

# 2. Playwright scenarios (every playwright-scenarios/*.mjs)
args=()
for f in playwright-scenarios/*.mjs; do args+=(--test "$f"); done
out="$(node "$VERIFY" --root . "${args[@]}" --seed 1 2>&1)"
status=$?

echo "$out" | grep -E '^FAIL|^[0-9]+ passed|Error:' || true
if [ $status -ne 0 ] || ! echo "$out" | grep -qE ' 0 failed'; then
  echo "Full report: /tmp/verify-webpage/gangetabellen/report.json"
  exit 1
fi
