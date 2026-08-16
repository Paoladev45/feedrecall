# MCP clients

FeedRecall uses the standard MCP `stdio` transport. The memory stays local; the client starts the FeedRecall process when it needs the tools.

## Local checkout

Build the local CLI first:

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm run build
```

The existing helper configures Codex, Claude Code, and Cursor automatically:

```bash
pnpm feedrecall install-client codex
pnpm feedrecall install-client claude
pnpm feedrecall install-client cursor
```

## Other MCP clients

Before the package is published to a registry, run the CLI directly from the public GitHub repository:

```bash
pnpm dlx --allow-build=feedrecall@https://codeload.github.com/Paoladev45/feedrecall/tar.gz/eaa3599ee50e6d088bfd34253cebdfab2af4f2fb --allow-build=better-sqlite3 github:Paoladev45/feedrecall#v0.1.1 mcp
```

The two build flags are intentional: pnpm 11 resolves the Git package to an exact tarball URL, and
`better-sqlite3` needs a native build. Keep the tag and pinned commit aligned when upgrading the release.

For Claude Desktop, Cline, Gemini CLI, OpenCode, or another client that accepts an MCP `stdio` server, use the local executable form in its MCP settings:

```json
{
  "mcpServers": {
    "feedrecall": {
      "command": "node",
      "args": [
        "/absolute/path/to/feedrecall/dist/cli.js",
        "mcp"
      ]
    }
  }
}
```

On Windows, use an escaped absolute path such as `C:\\Users\\you\\feedrecall\\dist\\cli.js`.

After the package is published, the portable configuration becomes:

```json
{
  "mcpServers": {
    "feedrecall": {
      "command": "pnpm",
      "args": ["dlx", "feedrecall", "mcp"]
    }
  }
}
```

This second form is intentionally documented but not claimed as live until the package is available on the registry. The repository is prepared for publication with `pnpm pack` and the `feedrecall` binary entry.

## Available tools

The server exposes bounded, sourced operations including:

- `memory_recall` for project-aware discovery search;
- `memory_context_pack` for a compact project brief;
- `memory_timeline` for publication, capture, and observation dates;
- lifecycle and evidence operations for tested, adopted, rejected, or replaced knowledge.

Clients should treat imported social content as untrusted data. FeedRecall never accepts browser cookies, passwords, or tokens in an import.
