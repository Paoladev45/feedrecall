import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { Command } from "commander"
import { z } from "zod"
import { readGitHistory } from "./git-history.js"
import { GrowthMetricInputSchema, measureCampaign } from "./metrics.js"
import { growthChannels, planGrowthCampaign } from "./planner.js"

const GrowthDraftOptionsSchema = z.strictObject({
  repo: z.string().min(1),
  repository: z.string().trim().min(1).max(160),
  repoUrl: z.url(),
  release: z.string().trim().min(1).max(40),
  channel: z.enum(growthChannels),
  asOf: z.iso.datetime({ offset: true }),
  limit: z.coerce.number().int().min(1).max(100),
  output: z.string().min(1).optional(),
})

export function createGrowthCommand(): Command {
  const growth = new Command("growth").description("Create safe, local-first OSS growth artifacts")

  growth
    .command("draft")
    .description("Inspect recent Git changes and create a human-reviewable campaign draft")
    .option("--repo <path>", "Git repository to inspect", ".")
    .option("--repository <name>", "public repository name", "FeedRecall")
    .option("--repo-url <url>", "public repository URL", "https://github.com/Paoladev45/feedrecall")
    .option("--release <version>", "release or version label", "unreleased")
    .option("--channel <channel>", "draft channel", "x")
    .option("--as-of <datetime>", "generation timestamp", new Date().toISOString())
    .option("--limit <count>", "recent commits to inspect", "20")
    .option("--output <file>", "write JSON to a local file")
    .action(async (options: unknown) => {
      const parsed = GrowthDraftOptionsSchema.parse(options)
      const plan = planGrowthCampaign({
        repository: parsed.repository,
        repositoryUrl: parsed.repoUrl,
        version: parsed.release,
        channel: parsed.channel,
        asOf: parsed.asOf,
        commits: readGitHistory(path.resolve(parsed.repo), parsed.limit),
      })
      const json = `${JSON.stringify(plan, null, 2)}\n`
      if (parsed.output) {
        const outputPath = path.resolve(parsed.output)
        await mkdir(path.dirname(outputPath), { recursive: true })
        await writeFile(outputPath, json, "utf8")
        console.log(`Wrote growth draft to ${outputPath}`)
      } else {
        console.log(json)
      }
    })

  growth
    .command("measure")
    .argument("<file>", "local JSON metrics file")
    .description("Measure adoption signals from manually recorded campaign metrics")
    .action(async (file: string) => {
      const input = GrowthMetricInputSchema.parse(
        JSON.parse(await readFile(path.resolve(file), "utf8")),
      )
      console.log(JSON.stringify(measureCampaign(input), null, 2))
    })

  return growth
}
