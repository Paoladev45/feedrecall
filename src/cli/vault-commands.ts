import path from "node:path"
import type { Command } from "commander"
import { z } from "zod"
import { OllamaClient } from "../enrichment/ollama.js"
import { processVault } from "../enrichment/process.js"
import { importFile } from "../importers/json.js"
import { importProjects } from "../importers/projects.js"
import { importTwitterLibrary } from "../importers/twitter-library.js"
import { importUrl } from "../importers/url.js"
import { dataDirectory } from "../paths.js"
import type { CliDependencies } from "./dependencies.js"

export function addVaultCommands(program: Command, dependencies: CliDependencies): void {
  program
    .command("init")
    .description("Create the local vault")
    .action(() => {
      const vault = dependencies.openVault()
      vault.close()
      console.log(`FeedRecall initialized at ${dataDirectory()}`)
    })

  program
    .command("import")
    .argument("<file>")
    .description("Import a FeedRecall JSON file")
    .action(async (file) => {
      const vault = dependencies.openVault()
      try {
        const counts = await importFile(vault, path.resolve(z.string().parse(file)))
        vault.refreshAllRelevance()
        console.log(
          `Imported ${counts.inserted}; updated ${counts.updated}; unchanged ${counts.unchanged}`,
        )
      } finally {
        vault.close()
      }
    })

  program
    .command("import-twitter-library")
    .argument("<file>")
    .description("Import a local X library.json snapshot without the X API or cookies")
    .action(async (file) => {
      const vault = dependencies.openVault()
      try {
        const report = await importTwitterLibrary(vault, path.resolve(z.string().parse(file)))
        vault.refreshAllRelevance()
        console.log(
          [
            `Imported ${report.sourceRecords} source records: ${report.inserted} inserted; ${report.updated} updated; ${report.unchanged} unchanged`,
            `Media: ${report.mediaItems} across ${report.recordsWithMedia} records; linked resources: ${report.externalLinks}`,
            `Categories: ${report.categories.length}`,
          ].join("\n"),
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
      const vault = dependencies.openVault()
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
      const vault = dependencies.openVault()
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
      const vault = dependencies.openVault()
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
      const vault = dependencies.openVault()
      try {
        const counts = await processVault(vault, new OllamaClient(), parsed)
        console.log(`Processed ${counts.processed}; skipped ${counts.skipped}`)
      } finally {
        vault.close()
      }
    })
}
