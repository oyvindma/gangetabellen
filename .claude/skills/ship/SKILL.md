---
name: ship
description: Verify and commit the current changes in this repo (run scripts/check.sh, review the diff, commit), then ask before pushing to main. Use when the user says "ship", "commit and push", or asks to publish the current changes.
---

# Ship

Standard flow for publishing a change to Gangetabellen. GitHub Pages deploys from `main`, so a push publishes the site.

1. **Check.** Run `scripts/check.sh`. If anything fails, fix it (or report it) and stop; do not commit a failing state. If `index.html` structure or behaviour changed, make sure `playwright-scenarios/` and `CLAUDE.md` were updated in the same change.
2. **Review.** Run `git status -sb` and `git diff --stat`. Stage only intended files by name (never `git add -A`; `.idea/` and `.playwright-cli/` are not for the repo).
3. **Commit.** Short imperative subject, optional body explaining why, and end with the attribution line from the session's system reminder.
4. **Push.** Ask the user before running `git push`, unless they already said to push in this request. Pushing publishes the site and is deliberately not allowlisted in `.claude/settings.json`.
5. **Report.** Give the commit hash and say whether it was pushed. Do not claim the live site was checked unless it was.

Use the `Edit` tool for file changes, not shell heredocs, so no extra approvals are needed.
