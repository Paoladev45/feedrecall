import { mkdtemp, readFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { z } from "zod"
import { createGrowthCommand } from "../src/growth/command.js"

const GrowthPlanOutputSchema = z.object({
  kind: z.literal("growth_plan"),
  status: z.enum(["draft", "quiet"]),
  draft: z
    .object({
      safety: z.object({
        requiresHumanApproval: z.literal(true),
        externalSideEffects: z.tuple([]),
      }),
    })
    .nullable(),
})

describe("growth CLI", () => {
  it("writes a reviewable local plan without an external destination", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "feedrecall-growth-cli-"))
    const output = path.join(directory, "growth-plan.json")
    const command = createGrowthCommand()

    await command.parseAsync([
      "node",
      "growth",
      "draft",
      "--repo",
      process.cwd(),
      "--repo-url",
      "https://github.com/Paoladev45/feedrecall",
      "--output",
      output,
    ])

    const plan = GrowthPlanOutputSchema.parse(JSON.parse(await readFile(output, "utf8")))
    expect(plan.kind).toBe("growth_plan")
    expect(plan.draft?.safety.requiresHumanApproval).toBe(true)
  })
})
