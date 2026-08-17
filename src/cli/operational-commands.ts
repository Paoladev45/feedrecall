import { spawn } from "node:child_process"
import path from "node:path"
import type { Command } from "commander"
import { z } from "zod"
import { clientNames, installClient } from "../client-install.js"
import { startHttpServer } from "../http-server.js"
import { serveMcp } from "../mcp/server.js"
import { dataDirectory } from "../paths.js"
import { packageMcpLaunch, releasePackageUrl } from "../product.js"
import type { CliDependencies } from "./dependencies.js"

async function runDemo(cliPath: string): Promise<void> {
  const packageRoot = path.resolve(path.dirname(cliPath), "..")
  const child = spawn(process.execPath, [path.join(packageRoot, "scripts", "demo.mjs")], {
    stdio: "inherit",
  })
  await new Promise<void>((resolve, reject) => {
    child.once("error", reject)
    child.once("exit", (code) => {
      if (code !== null && code !== 0) process.exitCode = code
      resolve()
    })
  })
}

export function addOperationalCommands(program: Command, dependencies: CliDependencies): void {
  program
    .command("setup")
    .argument("[client]", "Codex, Claude Code, or Cursor", "codex")
    .option("--package <specifier>", "package used by the MCP client", releasePackageUrl)
    .description("Initialize FeedRecall and connect it to an AI client")
    .action((client, options) => {
      const parsedClient = z.enum(clientNames).parse(client)
      const parsedOptions = z.object({ package: z.string().min(1) }).parse(options)
      const vault = dependencies.openVault()
      vault.close()
      console.log(
        installClient(parsedClient, packageMcpLaunch(parsedOptions.package), dependencies.home),
      )
      console.log(`FeedRecall initialized at ${dataDirectory()}`)
    })

  program
    .command("demo")
    .description("Run the private synthetic cockpit demo")
    .action(async () => {
      await runDemo(dependencies.cliPath)
    })

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
    .description("Connect this local checkout to Codex, Claude Code, or Cursor")
    .action((client) => {
      const parsed = z.enum(clientNames).parse(client)
      console.log(
        installClient(
          parsed,
          {
            executable: process.execPath,
            args: [dependencies.cliPath, "mcp"],
          },
          dependencies.home,
        ),
      )
    })
}
