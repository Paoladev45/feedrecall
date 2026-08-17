# MCP clients

FeedRecall uses the standard MCP `stdio` transport. The memory stays local; the client starts the FeedRecall process when it needs the tools.

## One-command setup

The GitHub release package can initialize the vault and connect FeedRecall without cloning the repository:

```bash
pnpm --config.ignore-scripts=true dlx https://github.com/Paoladev45/feedrecall/releases/latest/download/feedrecall.tgz setup codex
pnpm --config.ignore-scripts=true dlx https://github.com/Paoladev45/feedrecall/releases/latest/download/feedrecall.tgz setup claude
pnpm --config.ignore-scripts=true dlx https://github.com/Paoladev45/feedrecall/releases/latest/download/feedrecall.tgz setup cursor
```

The selected client receives a version-pinned release URL. This prevents silent upgrades while keeping the package independent from npm. Node.js 22.16+ and pnpm 11 are required.

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

The portable GitHub release configuration is:

```json
{
  "mcpServers": {
    "feedrecall": {
      "command": "pnpm",
      "args": [
        "--config.ignore-scripts=true",
        "dlx",
        "https://github.com/Paoladev45/feedrecall/releases/download/v0.2.0/feedrecall.tgz",
        "mcp"
      ]
    }
  }
}
```

On Windows clients that do not resolve `.cmd` shims automatically, use `cmd.exe` as the command and pass `/d`, `/s`, `/c`, and `pnpm --config.ignore-scripts=true dlx "URL" mcp` as arguments. The built-in setup command applies this compatibility rule automatically.

## Available tools

The server exposes bounded, sourced operations including:

- `memory_recall` for project-aware discovery search;
- `memory_context_pack` for a compact project brief;
- `memory_timeline` for publication, capture, and observation dates;
- lifecycle and evidence operations for tested, adopted, rejected, or replaced knowledge.

Clients should treat imported social content as untrusted data. FeedRecall never accepts browser cookies, passwords, or tokens in an import.
