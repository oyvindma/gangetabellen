#!/usr/bin/env bash
# Run all checks for index.html: js/*.js syntax, then every Playwright scenario
# in playwright-scenarios/ (desktop + phone) via the verify-webpage Claude skill.
# Prints only failures and the final tally. Exit code is non-zero if anything failed.
set -uo pipefail
cd "$(dirname "$0")/.."

VERIFY="$HOME/.claude/skills/verify-webpage/scripts/verify.mjs"
if [ ! -f "$VERIFY" ]; then
  echo "verify-webpage skill not found at $VERIFY (see CLAUDE.md)" >&2
  exit 2
fi

# 1. Syntax check of every js/*.js file
for f in js/*.js; do
  if ! node --check "$f"; then
    echo "FAIL  $f has a syntax error"
    exit 1
  fi
done
echo "ok    js syntax"

# 2. Playwright scenarios (every playwright-scenarios/*.mjs) against every design page
args=()
for f in playwright-scenarios/*.mjs; do args+=(--test "$f"); done
failed=0
for page in index.html index-minecraft.html index-cat.html; do
  echo "--- $page"
  out="$(node "$VERIFY" --root . --page "$page" "${args[@]}" --seed 1 2>&1)"
  status=$?
  echo "$out" | grep -E '^FAIL|^[0-9]+ passed|Error:' || true
  if [ $status -ne 0 ] || ! echo "$out" | grep -qE ' 0 failed'; then failed=1; fi
done
if [ $failed -ne 0 ]; then
  echo "Full report: /tmp/verify-webpage/gangetabellen/report.json"
  exit 1
fi
