# FeedRecall Roadmap

## Product identity

FeedRecall is a personal knowledge operating system for AI agents. Its distinguishing loop is:

```text
Internet discovery -> understanding -> project relevance -> experiment
-> implementation decision -> durable memory
```

It is not a generic vector database, a social-network clone, or an autonomous truth oracle.

## v0.1: Memory

- Import synthetic JSON, generic URLs, and browser-captured posts.
- Deduplicate by stable platform identity or canonical URL.
- Track `published_at`, `first_seen_at`, and `last_seen_at` separately.
- Classify processing, evidence, and decision states independently.
- Search by text, source, topic, project, evidence, and date.
- Group discoveries into day, week, or month timelines using published, first-seen, or last-seen dates.
- Expose the same tools through a local MCP server.
- Run without a model; optionally enrich through local Ollama.

## v0.2: Projects

- Model projects as goals, technologies, repositories, problems, discoveries, experiments, and decisions.
- Produce transparent relevance scores with human-editable reasons.
- Generate small project context packs instead of dumping the entire vault into an agent. The CLI
  command is `feedrecall context --project <slug>` and MCP exposes `memory_context_pack`.
- Add Collections for learning themes distinct from active Projects.
- Recall forgotten discoveries with evidence-aware ranking through `feedrecall recall` and
  `memory_recall`.

## v0.3: Intelligence

- Detect opportunities by comparing discoveries with active project constraints.
- Create bounded experiments from opportunities.
- Hand an evidence-backed evaluation prompt to Codex, Claude Code, or Cursor.
- Record results and decisions back into memory.
- Never implement, publish, purchase, or delete external data without an explicit user action.

## Later connectors

The connector contract is platform-neutral. Planned sources include X, GitHub Stars, YouTube, Reddit, Hacker News, browser URLs, and local documents. Platform-specific capture remains optional.
