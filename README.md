# FeedRecall

**Your feed is an inbox, not a knowledge base.**

FeedRecall turns likes, bookmarks, saved links, repositories, videos, and articles into persistent project-aware memory for AI agents. It runs locally, keeps an evidence trail, and exposes the same memory to Codex, Claude Code, Cursor, and other MCP clients.

![FeedRecall local memory cockpit](docs/assets/feedrecall-cockpit.jpg)

## Why

Saving a discovery is only the beginning:

```text
capture -> enrich -> classify -> connect to projects -> verify -> test -> adopt or reject
```

FeedRecall remembers both what a source claimed and what you or your agents later observed. Six months later, an agent can avoid recommending a tool that already failed your Windows test.

## Quick start

```bash
npm install
npm run build
node dist/cli.js init
node dist/cli.js import examples/discoveries.json
node dist/cli.js import-projects examples/projects.json
node dist/cli.js search "Roblox MCP"
node dist/cli.js recall "MCP memory" --project agent-memory
node dist/cli.js context --project agent-memory --output context/agent-memory.md
node dist/cli.js timeline --date-field published --group-by month
node dist/cli.js serve
```

The canonical database is `~/.feedrecall/feedrecall.db`, so local agents share one memory even when
they run from different project folders. Set `FEEDRECALL_HOME` only when you intentionally want an
isolated vault.

Optional local enrichment requires [Ollama](https://ollama.com/) and a local model:

```bash
ollama pull qwen3:4b
node dist/cli.js process --model qwen3:4b
```

Then connect the local MCP server:

```bash
node dist/cli.js install-client codex
node dist/cli.js install-client claude
node dist/cli.js install-client cursor
```

Agents can use `memory_recall` to recover a forgotten discovery and
`memory_context_pack` to load a bounded project brief with sources, dates, and
evidence status. `memory_timeline` groups the same memories by publication,
capture, or observation date. The equivalent CLI commands are:

```bash
node dist/cli.js recall "the MCP memory tool I saw last month" --project agent-memory
node dist/cli.js context --project agent-memory --output context/agent-memory.md
node dist/cli.js timeline --date-field first_seen --group-by week
```

## What v0.1 includes

- Local SQLite storage and full-text search.
- Idempotent JSON and URL imports.
- Processing, evidence, and decision lifecycles.
- Projects with transparent relevance scores.
- Timeline views grouped by day, week, or month using published, first-seen, and last-seen dates.
- Recall forgotten discoveries with project-aware evidence ranking.
- Generate compact Markdown context packs for individual projects.
- Read/write MCP tools with explicit annotations.
- Local dashboard and browser capture extension.
- Optional local enrichment through Ollama; core features work without it.

## Capture without the X API

FeedRecall does not require the paid X API. Load the unpacked extension from `extension/`, open your Likes or Bookmarks page while already signed in, and export the posts visible in your browser. FeedRecall never asks for your X password and never stores browser cookies.

The extension captures only posts currently rendered in the page. Scroll, scan, export, then import
the JSON. Repeating the flow is safe: stable source identifiers prevent duplicate memories while
`firstSeenAt` and `lastSeenAt` preserve the timeline.

Public post URLs can also be enriched with local collectors such as `gallery-dl` and `yt-dlp`. Network sources are treated as untrusted data, never executable instructions.

## Privacy

- Local-first by default; no telemetry.
- No remote model provider in the core application.
- Tokens, cookies, and passwords are not accepted in imports.
- The public repository contains only synthetic examples.
- Destructive social cleanup is intentionally outside v0.1.

## Roadmap

- **v0.1 Memory:** import, enrich, classify, search, timeline, MCP.
- **v0.2 Projects:** project objects, context packs, collections, stronger relevance.
- **v0.3 Intelligence:** opportunities, experiments, decisions, agent feedback loop.
- **v1 Knowledge OS:** discover, understand, suggest, test, implement, remember.

See [docs/PRODUCT_PLAN.md](docs/PRODUCT_PLAN.md) for the product model and release plan, and
[docs/ROADMAP.md](docs/ROADMAP.md) for acceptance criteria and boundaries.

## Architecture

```text
Browser / JSON / URL connectors
              |
              v
        SQLite + FTS5
              |
      +-------+--------+
      |                |
 Local cockpit     MCP server
                       |
          Codex / Claude Code / Cursor
```

ChatGPT desktop, Codex CLI, and the Codex IDE extension share the same local MCP configuration, as
described in the [official Codex MCP documentation](https://learn.chatgpt.com/codex/extend/mcp).
ChatGPT web requires a future remote, authenticated plugin and is intentionally outside this
local-first release.

## Contributing and security

See [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md). Never attach a real personal
vault or browser export to a public issue.

## License

Apache-2.0
