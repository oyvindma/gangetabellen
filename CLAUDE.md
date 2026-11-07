# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

"Gangetabellen" is a Norwegian-language multiplication-table (and add/subtract/divide) practice app for kids. The whole app is a single static file, `index.html` (inline CSS in `<style>`, inline JS in one `<script>` at the bottom). There is no build step, package manager, linter, or test suite.

## Commands

- Run locally: open `index.html` in a browser, or serve with `python3 -m http.server` from the repo root.
- Browser checks: `playwright-scenarios/` holds Playwright scenarios (`gameplay.mjs`, `sticky-progress.mjs`, `persistence.mjs`) that run in headless Chromium via the `verify-webpage` Claude skill (installed in `~/.claude/skills`, not in this repo; it manages Playwright itself, so don't add it to the repo). From the repo root:
  `node ~/.claude/skills/verify-webpage/scripts/verify.mjs --root . --test playwright-scenarios/gameplay.mjs --test playwright-scenarios/sticky-progress.mjs --test playwright-scenarios/persistence.mjs --seed 1`
  They default to desktop and phone viewports (tablet is not covered). Run them after changing `index.html`. When you change the page structure (ids, classes, DOM layout) or add/remove/alter functionality, update the scenarios to match (and add new ones for new features) in the same change.
- Deploy: pushing to `main` triggers `.github/workflows/static.yml`, which publishes the repo root as-is to GitHub Pages.

## Architecture

- UI text is Norwegian; keep new user-facing strings in Norwegian.
- Fonts (Nunito, Fredoka One) load from Google Fonts; styling uses CSS custom properties (e.g. `--secondary-color`) and has responsive breakpoints for small screens (recent work: 2-column layout, sticky progress bar).
- The inline script is organised in sections: config constants, a single `state` object, problem model (`buildProblem`, `generateDistributedProblems` — pure data, no markup), layout (`layoutProblems`, `columnFirstOrder`), rendering (`formatEquation`, `setInputState`, `renderScore`, `renderProgress`), game state (`resetGameState`, `awardCorrectAnswer`), answer checking, and controls. Keep markup out of the problem model and DOM writes out of the game-state functions.
- Flow: `window.onload` / any control change → `createMathProblems()` → `readSelections()` (defaults to numbers 1–10 and multiplication, and ticks the boxes) → `generateDistributedProblems()` (`TOTAL_PROBLEMS_COUNT` = 100, spread evenly over operations) → `displayProblems()` → `layoutProblems()` → `setAnswersVisible()` (also resets score/progress).
- Sorted order is column-first: `layoutProblems()` reorders the existing DOM nodes (by `data-rank`) using the grid's *current* column count read from CSS, and re-runs on resize without losing answers. Don't hardcode column counts.
- Whether an input is solved is stored in `input.dataset.solved`, set only via `setInputState()`; points are awarded only on the first correct answer.
- `toggleOrder()` regenerates via `createMathProblems()`; `toggleAnswers()` fills/clears inputs and resets score. The session is persisted in `localStorage` (`STORAGE_KEY`): config, the problem list (`state.problems`), per-input value/state and score, written by `saveSession()` and rebuilt on load by `restoreSession()` (falls back to `createMathProblems()`). Every settings control calls `onConfigChange(el)` and the `#clear-btn` calls `clearTest()`; both ask `confirmDiscardProgress()` (true only if `hasProgress()`, i.e. non-read-only inputs have text) and revert the control if declined. Clear generates a new test. No backend.
