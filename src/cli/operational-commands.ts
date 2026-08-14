import path from "node:path"
import type { Command } from "commander"
import { z } from "zod"
import { clientNames, installClient } from "../client-install.js"
import { startHttpServer } from "../http-server.js"
import { serveMcp } from "../mcp/server.js"
import type { Vault } from "../storage/vault.js"

export type OperationalCommandDependencies = {
  readonly openVault: () => Vault
  readonly cliPath: string
  readonly home: string
}

export function addOperationalCommands(
  program: Command,
  dependencies: OperationalCommandDependencies,
): void {
  program
    .command("mcp")
    .description("Start the MCP server over stdio")
    .action(async () => {
      await serveMcp(dependencies.openVault())
    })

  program
    .command("serve")
    .option("--port <port>", "local port", "4173")
    .description("Start the local cockpit")
    .action((options) => {
      const here = path.dirname(dependencies.cliPath)
      startHttpServer(
        dependencies.openVault(),
        z.coerce.number().int().min(1024).max(65_535).parse(options.port),
        path.join(here, "web"),
      )
    })

  program
    .command("install-client")
    .argument("<client>")
    .description("Connect FeedRecall to Codex, Claude Code, or Cursor")
    .action((client) => {
      const parsed = z.enum(clientNames).parse(client)
      console.log(installClient(parsed, dependencies.cliPath, dependencies.home))
    })
}
