# FeedRecall in three minutes

This walkthrough uses the synthetic examples committed in the repository. It does not read your browser, X account, cookies, or private files.

## 1. Build and load the example vault

```bash
npm install
npm run build
node dist/cli.js init
node dist/cli.js import examples/discoveries.json
node dist/cli.js import-projects examples/projects.json
```

## 2. Ask the memory layer a question

```bash
node dist/cli.js recall "MCP memory" --project agent-memory
```

The result is ranked by text match, project relevance, evidence, priority, and recency. Every match keeps its source URL and evidence status.

## 3. Create an agent context pack

```bash
node dist/cli.js context --project agent-memory --output context/agent-memory.md
```

The generated Markdown is intentionally bounded. It gives an agent the project goals, relevant discoveries, provenance, and safety notes without loading the entire vault.

## 4. Inspect the timeline and review queue

```bash
node dist/cli.js timeline --date-field published --group-by month
node dist/cli.js obsolescence
node dist/cli.js serve
```

Open `http://127.0.0.1:4173/` after starting the server. The cockpit shows the same memories grouped by date and highlights items that may need review. It never removes a social like or bookmark.

## 5. Connect an MCP client

```bash
node dist/cli.js install-client codex
node dist/cli.js install-client claude
node dist/cli.js install-client cursor
```

Then ask the client:

```text
What did I save about MCP memory that is relevant to this project?
Which saved discovery has actually been tested?
Show me older tool recommendations that may have been replaced, with evidence.
```

## Try it with your own data

Use the browser extension only after you understand the synthetic flow. It captures posts that are already rendered in a signed-in browser page after an explicit click. It does not read cookies, passwords, private messages, or account settings. See [the extension guide](../extension/README.md).
