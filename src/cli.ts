import { mkdirSync } from "node:fs"
import { writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { Command } from "commander"
import { z } from "zod"
import { addOperationalCommands } from "./cli/operational-commands.js"
import { buildContextPack, ProjectNotFoundError } from "./context-pack.js"
import { OllamaClient } from "./enrichment/ollama.js"
import { processVault } from "./enrichment/process.js"
import { createGrowthCommand } from "./growth/command.js"
import { importFile } from "./importers/json.js"
import { importProjects } from "./importers/projects.js"
import { importUrl } from "./importers/url.js"
import { ObsolescenceInputSchema } from "./obsolescence.js"
import { databasePath, dataDirectory } from "./paths.js"
import { recall } from "./recall.js"
import { Vault } from "./storage/vault.js"
import { TimelineInputSchema } from "./timeline.js"

function openVault(): Vault {
  mkdirSync(dataDirectory(), { recursive: true })
  return new Vault(databasePath())
}

const program = new Command()
  .name("feedrecall")
  .description("Local-first, project-aware memory for AI agents")
  .version("0.1.0")

program.addCommand(createGrowthCommand())

addOperationalCommands(program, {
  openVault,
  cliPath: fileURLToPath(import.meta.url),
  home: process.env["USERPROFILE"] ?? process.env["HOME"] ?? ".",
})

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
      for (const memory of vault.search({ query: "", limit: 500 }))
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
  .command("recall")
  .argument("<query>", "remembered discovery to find")
  .option("--project <slug>")
  .option("--limit <count>", "maximum matches", "10")
  .description("Recall the strongest matching discoveries")
  .action((query, options) => {
    const parsed = z
      .object({
        query: z.string().min(1),
        project: z.string().min(1).optional(),
        limit: z.coerce.number().int().min(1).max(50),
      })
      .parse({ query, ...options })
    const vault = openVault()
    try {
      console.log(JSON.stringify(recall(vault, parsed), null, 2))
    } finally {
      vault.close()
    }
  })

program
  .command("context")
  .option("--project <slug>", "project slug", "")
  .option("--limit <count>", "maximum discoveries", "20")
  .option("--output <file>", "write the Markdown pack to a file")
  .description("Build a compact Markdown context pack for one project")
  .action(async (options) => {
    const parsed = z
      .object({
        project: z.string().min(1),
        limit: z.coerce.number().int().min(1).max(50),
        output: z.string().min(1).optional(),
      })
      .parse(options)
    const vault = openVault()
    try {
      const pack = buildContextPack(vault, parsed)
      if (parsed.output) {
        await writeFile(path.resolve(parsed.output), pack.markdown, "utf8")
        console.log(`Wrote context pack for ${pack.project.name} to ${path.resolve(parsed.output)}`)
      } else {
        console.log(pack.markdown)
      }
    } catch (error) {
      if (error instanceof ProjectNotFoundError) {
        console.error(error.message)
        process.exitCode = 1
      } else {
        throw error
      }
    } finally {
      vault.close()
    }
  })

program
  .command("timeline")
  .option("--date-field <field>", "date to use: published, first_seen, or last_seen", "published")
  .option("--group-by <unit>", "group by day, week, or month", "day")
  .option("--project <slug>")
  .option("--after <date>", "inclusive ISO date or datetime")
  .option("--before <date>", "inclusive ISO date or datetime")
  .option("--limit <count>", "maximum discoveries", "100")
  .description("Group discoveries into a chronological timeline")
  .action((options) => {
    const parsed = TimelineInputSchema.parse({
      dateField: options.dateField,
      groupBy: options.groupBy,
      project: options.project,
      after: options.after,
      before: options.before,
      limit: options.limit,
    })
    const vault = openVault()
    try {
      console.log(
        JSON.stringify(
          vault.timeline({
            dateField: parsed.dateField,
            groupBy: parsed.groupBy,
            ...(parsed.project ? { project: parsed.project } : {}),
            ...(parsed.after ? { after: parsed.after } : {}),
            ...(parsed.before ? { before: parsed.before } : {}),
            limit: parsed.limit,
          }),
          null,
          2,
        ),
      )
    } finally {
      vault.close()
    }
  })

program
  .command("obsolescence")
  .option("--as-of <datetime>", "evaluate freshness at this ISO datetime")
  .option("--limit <count>", "maximum discoveries to assess", "500")
  .description("Suggest discoveries that may have expired or been replaced")
  .action((options) => {
    const parsed = ObsolescenceInputSchema.parse({
      ...(options.asOf ? { asOf: options.asOf } : {}),
      limit: options.limit,
    })
    const vault = openVault()
    try {
      console.log(
        JSON.stringify(
          vault.obsolescence({
            ...(parsed.asOf ? { asOf: parsed.asOf } : {}),
            limit: parsed.limit,
          }),
          null,
          2,
        ),
      )
    } finally {
      vault.close()
    }
  })

await program.parseAsync(process.argv)
