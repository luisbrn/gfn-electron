# Non-PR Fork Maintenance Workflow

## Purpose

This document describes a concise workflow for maintaining a fork of a repository without using pull requests. It's tailored to the `luisbrn/gfn-electron` fork and the helper scripts included in `scripts/` (e.g. `sync-upstream.fish`, `new-branch.fish`, `release.fish`).

## Principles

- Direct pushes to your fork are the primary way you change this repository. Keep long-lived branches minimal.
- Keep `steam-rpc-feature` and `master` in sync with upstream frequently.
- Use small, well-named topic branches for features and bugfixes. Push them to your fork and run CI against them.
- Protect important branches (local policy) and rely on CI to catch regressions.
- Keep secrets and local config out of the repository (use `scripts/local-config.js` and `.gitignore`).

## Quick checklist (before pushing)

- [ ] Pull latest upstream changes and rebase your branch (use `scripts/sync-upstream.fish`).
- [ ] Run tests locally: `npm ci && npm test` or `npm run test:unit`.
- [ ] Run linters and formatters (Husky will check on commit): `npm run format:check` and `npm run lint`.
- [ ] Update version/changelog if releasing and create `release` branch using `scripts/release.fish`.
- [ ] Ensure no local secrets are committed (check `scripts/local-config.js` is in `.gitignore`).

## Commands (fish shell)

Sync from upstream to your current branch:

```fish
git fetch upstream --prune
git checkout steam-rpc-feature
git rebase upstream/master
git push fork steam-rpc-feature --force-with-lease
```

Create a new topic branch and push to fork (use `scripts/new-branch.fish`):

```fish
# Creates and pushes new branch named "fix/description"
scripts/new-branch.fish fix/description
```

Release helper flow (tagging and pushing a release):

```fish
scripts/release.fish v1.2.3 "Release notes or short message"
```

## Notes about history rewrites

- You've rewritten history to remove sensitive files (e.g., `PR_DESCRIPTION.md`). If you ever need to rewrite history again:
  - Inform collaborators or force-push only to your fork.
  - Use `--force-with-lease` where collaborators are possible.

## CI and Coverage

- CI is configured to run on pushes to your fork and branch. Expect tests and linting to run automatically.
- Coverage is uploaded to Codecov for the `steam-rpc-feature` branch via the workflow. If you want per-file reports, provide the Codecov token or use the web UI for the fork's branch.

## Safety and backups

- Keep an additional backup remote if you maintain important branches outside of GitHub.
- Regularly fetch upstream and test before merging large changes.

## Further reading and references

- `scripts/README.md` — details about Discord RPC and how to disable it.
- `README.md` — project overview and badges.

If you want, I can:

- Add a short script that automatically updates the README coverage badge after CI (requires a GH PAT), or
- Add additional unit tests which mock `discord-rich-presence` to increase coverage and reliability.
