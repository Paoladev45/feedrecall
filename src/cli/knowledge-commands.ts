import { writeFile } from "node:fs/promises"
import path from "node:path"
import type { Command } from "commander"
import { z } from "zod"
import { buildContextPack, ProjectNotFoundError } from "../context-pack.js"
import { ObsolescenceInputSchema } from "../obsolescence.js"
import { recall } from "../recall.js"
import { TimelineInputSchema } from "../timeline.js"
import type { CliDependencies } from "./dependencies.js"

export function addKnowledgeCommands(program: Command, dependencies: CliDependencies): void {
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
      const vault = dependencies.openVault()
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
      const vault = dependencies.openVault()
      try {
        const pack = buildContextPack(vault, parsed)
        if (parsed.output) {
          await writeFile(path.resolve(parsed.output), pack.markdown, "utf8")
          console.log(
            `Wrote context pack for ${pack.project.name} to ${path.resolve(parsed.output)}`,
          )
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
      const vault = dependencies.openVault()
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
      const vault = dependencies.openVault()
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
}
