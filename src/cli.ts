import { mkdirSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { Command } from "commander"
import { z } from "zod"
import { clientNames, installClient } from "./client-install.js"
import { OllamaClient } from "./enrichment/ollama.js"
import { processVault } from "./enrichment/process.js"
import { startHttpServer } from "./http-server.js"
import { importFile } from "./importers/json.js"
import { importProjects } from "./importers/projects.js"
import { importUrl } from "./importers/url.js"
import { serveMcp } from "./mcp/server.js"
import { databasePath, dataDirectory } from "./paths.js"
import { Vault } from "./storage/vault.js"

function openVault(): Vault {
  mkdirSync(dataDirectory(), { recursive: true })
  return new Vault(databasePath())
}

const program = new Command()
  .name("feedrecall")
  .description("Local-first, project-aware memory for AI agents")
  .version("0.1.0")

program
  .command("init")
  .description("Create the local vault")
  .action(() => {
    const vault = openVault()
    vault.close()
    console.log(`FeedRecall initialized at ${dataDirectory()}`)
  })

program
  .command("import")
  .argument("<file>")
  .description("Import a FeedRecall JSON file")
  .action(async (file) => {
    const vault = openVault()
    try {
      const counts = await importFile(vault, path.resolve(z.string().parse(file)))
      for (const memory of vault.search({ query: "", limit: 100 }))
        vault.refreshRelevance(memory.id)
      console.log(
        `Imported ${counts.inserted}; updated ${counts.updated}; unchanged ${counts.unchanged}`,
      )
    } finally {
      vault.close()
    }
  })

program
  .command("import-projects")
  .argument("<file>")
  .description("Import project definitions")
  .action(async (file) => {
    const vault = openVault()
    try {
      const count = await importProjects(vault, path.resolve(z.string().parse(file)))
      console.log(`Imported ${count} projects and refreshed relevance`)
    } finally {
      vault.close()
    }
  })

program
  .command("add")
  .argument("<url>")
  .description("Save one URL")
  .action((url) => {
    const vault = openVault()
    try {
      console.log(importUrl(vault, z.url().parse(url)))
    } finally {
      vault.close()
    }
  })

program
  .command("search")
  .argument("[query]", "search terms", "")
  .option("--project <slug>")
  .option("--evidence <status>")
  .action((query, options) => {
    const vault = openVault()
    try {
      const results = vault.search({
        query: z.string().parse(query),
        ...(options.project ? { project: z.string().parse(options.project) } : {}),
        ...(options.evidence ? { evidence: z.string().parse(options.evidence) } : {}),
      })
      console.log(JSON.stringify(results, null, 2))
    } finally {
      vault.close()
    }
  })

program
  .command("process")
  .description("Enrich captured discoveries with a local Ollama model")
  .option("--model <model>", "local Ollama model", "qwen3:4b")
  .option("--limit <count>", "maximum discoveries", "25")
  .action(async (options) => {
    const parsed = z
      .object({ model: z.string().min(1), limit: z.coerce.number().int().min(1).max(100) })
      .parse(options)
    const vault = openVault()
    try {
      const counts = await processVault(vault, new OllamaClient(), parsed)
      console.log(`Processed ${counts.processed}; skipped ${counts.skipped}`)
    } finally {
      vault.close()
    }
  })

program
  .command("mcp")
  .description("Start the MCP server over stdio")
  .action(async () => {
    await serveMcp(openVault())
  })

program
  .command("serve")
  .option("--port <port>", "local port", "4173")
  .description("Start the local cockpit")
  .action((options) => {
    const here = path.dirname(fileURLToPath(import.meta.url))
    startHttpServer(
      openVault(),
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
    console.log(
      installClient(
        parsed,
        fileURLToPath(import.meta.url),
        process.env["USERPROFILE"] ?? process.env["HOME"] ?? ".",
      ),
    )
  })

await program.parseAsync(process.argv)
