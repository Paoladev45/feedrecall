# FeedRecall Product Plan

## Goal

FeedRecall turns a fast-moving stream of saved discoveries into durable, project-aware memory that
any AI agent can query. The product is useful only when it preserves provenance, distinguishes
claims from tested knowledge, and routes a small relevant context pack instead of dumping an entire
archive into a model.

## Knowledge loop

```text
capture -> understand -> classify -> connect to projects -> verify -> test -> decide -> remember
```

Saving is the start of the lifecycle. A discovery can later become `observed`, `verified`, `tested`,
`adopted`, `rejected`, or `replaced`. A new social import must never erase stronger local evidence.

## Temporal model

FeedRecall stores three dates because they answer different questions:

- `published_at`: when the source was published.
- `first_seen_at`: when the user first captured it.
- `last_seen_at`: when the connector most recently observed it.

The default timeline sorts by publication date, with first-seen as the fallback. Imports are
idempotent, so a daily export refreshes `last_seen_at` without duplicating the memory. Future views
will group discoveries by day, week, month, source, and project while keeping these dates distinct.

## Connector contract

X is the first capture experience, not an architectural dependency. Every connector produces the
same strict import envelope and must document:

1. what the user explicitly asked it to read;
2. which fields it extracts;
3. where data is stored;
4. which external actions remain user-controlled.

The X extension reads visible rendered posts after a click and needs no X API. Planned connectors
include GitHub Stars, YouTube, Reddit, Hacker News, generic URLs, and local documents.

## Agent access

SQLite plus source files form the canonical local store. MCP is the shared agent boundary:

- Codex, the ChatGPT desktop app, and the Codex IDE extension share one local MCP configuration.
- Claude Code and Cursor connect to the same STDIO server and the same `~/.feedrecall` database.
- ChatGPT web requires a remote authenticated plugin later; it cannot read a local desktop database.

Read tools search and retrieve. Write tools only record local lifecycle decisions. Captured content
is untrusted data and can never supply executable agent instructions.

## Releases

### v0.1: Memory

- Capture visible X posts without the X API.
- Import JSON and URLs without duplicates.
- Track publication, first-seen, and last-seen dates.
- Search SQLite FTS5 by text, evidence, project, and date.
- Optionally enrich with a local Ollama model.
- Query and update the lifecycle through MCP.
- Inspect discoveries, evidence, relevance, and opportunities in the local cockpit.

### v0.2: Projects

- Generate bounded project context packs.
- Add collections for learning topics distinct from active projects.
- Let users edit relevance rules and project constraints.
- Add GitHub Stars and generic browser capture connectors.

### v0.3: Intelligence

- Detect project opportunities from newly captured discoveries.
- Create bounded experiments for Codex, Claude Code, or Cursor.
- Record experiment results and implementation decisions back into memory.
- Explain every recommendation using source and local evidence.

### v1: Knowledge OS

- Complete the discover, suggest, test, integrate, and remember loop.
- Support an optional encrypted remote service for web clients and multi-device sync.
- Keep external publishing, purchases, account operations, and destructive cleanup behind explicit
  user actions.

## Success measures

- A user can find a forgotten discovery in under 30 seconds.
- An agent can retrieve a relevant project pack without receiving unrelated memories.
- Re-importing the same source creates no duplicate and cannot downgrade evidence.
- Every recommendation exposes its source, date, evidence level, project score, and reasons.
- A user can switch between supported local agent clients without rebuilding the vault.
