# Changelog

All notable changes to FeedRecall are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-08-17

### Added
- Public one-command install from GitHub releases via `pnpm dlx`:
  `pnpm --config.ignore-scripts=true dlx https://github.com/Paoladev45/feedrecall/releases/latest/download/feedrecall.tgz`
  (distributed as a `.tgz`, independent from npm).
- `src/product.ts`: single source of truth for the package version and the
  `latest` / version-pinned release URLs.
- Version-pinned public MCP launcher: `setup codex|claude|cursor` and
  `install-client` now write the exact release URL into the client config so an
  existing setup is never silently upgraded.
- Windows `cmd.exe` launcher shim (`/d /s /c`) with command-injection hardening
  for clients that do not resolve `.cmd` shims automatically.
- GitHub Actions release workflow (`release.yml`): on a `v*` tag, run the full
  check, pack `feedrecall.tgz`, write `feedrecall.tgz.sha256`, and create the
  GitHub release.
- Windows CI: the check matrix now runs on `ubuntu-latest` and
  `windows-latest`.
- Tests for Windows `cmd` routing and Cursor configuration preservation
  (test suite now 47 tests, green on Ubuntu and Windows).

### Changed
- Refactored the CLI into modular command files under `src/cli/`
  (`vault-commands`, `knowledge-commands`, `operational-commands`,
  `dependencies`).
- The MCP server banner now reports the real package version instead of a
  hard-coded value.
- Updated `README.md`, `docs/CLIENTS.md`, and `docs/DEMO.md` to the
  one-command `pnpm dlx` install flow.

### Fixed
- Corrected the pnpm GitHub installation instructions (pinned the tested
  v0.1.1 Git locator and documented build-script handling).

## [0.1.1] - 2026-08-16

### Changed
- Prepared the package for public pnpm adoption.
- Bumped the package version to 0.1.1 to align with the merged public-alpha
  improvements. Local and GitHub CI passed on Ubuntu and Windows.

## [0.1.0] - 2026-08-14

### Added
- Initial public alpha: local-first, project-aware memory for AI agents.
- Local SQLite storage with full-text search.
- Idempotent JSON and URL imports.
- Processing, evidence (claimed/observed/verified/tested), and decision
  (adopted/rejected/replaced) lifecycles.
- Projects with transparent relevance scores.
- Timeline views grouped by day, week, or month using published, first-seen,
  and last-seen dates.
- Project-aware recall with evidence ranking.
- Compact Markdown context packs per project.
- MCP server over stdio with read/write tools and explicit annotations.
- Explainable freshness review (14/60/120/365-day windows → fresh/watch/
  likely_expired/likely_replaced).
- Local cockpit dashboard and the browser capture extension.
- Optional local enrichment through Ollama (core features work without it).
- Contributor documentation (`README.md`, `CONTRIBUTING.md`, `SECURITY.md`,
  `docs/`).

[0.2.0]: https://github.com/Paoladev45/feedrecall/releases/tag/v0.2.0
[0.1.1]: https://github.com/Paoladev45/feedrecall/releases/tag/v0.1.1
[0.1.0]: https://github.com/Paoladev45/feedrecall/releases/tag/v0.1.0
