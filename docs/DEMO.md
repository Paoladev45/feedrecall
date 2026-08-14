# FeedRecall in one minute

This walkthrough uses the synthetic examples committed in the repository. It does not read your browser, X account, cookies, or private files.

## 1. Start the interactive demo

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm demo
```

Open the URL printed by the command. The demo creates a temporary vault from the synthetic examples and starts the local cockpit on the first free local port.

## 2. Ask the memory layer a question

```bash
pnpm exec feedrecall recall "MCP memory" --project agent-memory
```

The result is ranked by text match, project relevance, evidence, priority, and recency. Every match keeps its source URL and evidence status.

## 3. Create an agent context pack

```bash
pnpm exec feedrecall context --project agent-memory --output context/agent-memory.md
```

The generated Markdown is intentionally bounded. It gives an agent the project goals, relevant discoveries, provenance, and safety notes without loading the entire vault.

## 4. Inspect the timeline and review queue

```bash
pnpm exec feedrecall timeline --date-field published --group-by month
pnpm exec feedrecall obsolescence
pnpm exec feedrecall serve
```

Open `http://127.0.0.1:4173/` after starting the server. The cockpit shows the same memories grouped by date and highlights items that may need review. It never removes a social like or bookmark.

## 5. Connect an MCP client

```bash
pnpm exec feedrecall install-client codex
pnpm exec feedrecall install-client claude
pnpm exec feedrecall install-client cursor
```

Then ask the client:

```text
What did I save about MCP memory that is relevant to this project?
Which saved discovery has actually been tested?
Show me older tool recommendations that may have been replaced, with evidence.
```

## Try it with your own data

Use the browser extension only after you understand the synthetic flow. It captures posts that are already rendered in a signed-in browser page after an explicit click. It does not read cookies, passwords, private messages, or account settings. See [the extension guide](../extension/README.md).
