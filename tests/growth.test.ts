import { describe, expect, it } from "vitest"
import { parseGitHistory } from "../src/growth/git-history.js"
import { measureCampaign } from "../src/growth/metrics.js"
import { type GrowthCommit, planGrowthCampaign } from "../src/growth/planner.js"

const BASE_INPUT = {
  repository: "FeedRecall",
  repositoryUrl: "https://github.com/Paoladev45/feedrecall",
  version: "v0.2.0",
  channel: "x" as const,
  asOf: "2026-08-14T12:00:00.000Z",
}

function commit(input: Partial<GrowthCommit> = {}): GrowthCommit {
  return {
    hash: "abc1234",
    authoredAt: "2026-08-14T10:00:00.000Z",
    subject: "Add project context packs",
    changedFiles: ["src/context-pack.ts", "src/mcp/tools.ts"],
    ...input,
  }
}

describe("growth campaign planner", () => {
  it("parses Git history into commit evidence without losing changed files", () => {
    const commits = parseGitHistory(
      "abc1234\x1f2026-08-14T10:00:00+00:00\x1fAdd context packs\n" +
        "src/context-pack.ts\n" +
        "docs/DEMO.md\n\n" +
        "def5678\x1f2026-08-13T10:00:00+00:00\x1fUpdate dependencies\npackage-lock.json\n",
    )

    expect(commits).toHaveLength(2)
    expect(commits[0]?.changedFiles).toEqual(["src/context-pack.ts", "docs/DEMO.md"])
    expect(commits[1]?.subject).toBe("Update dependencies")
  })

  it("creates an evidence-backed draft for a promotion-worthy product change", () => {
    const plan = planGrowthCampaign({
      ...BASE_INPUT,
      commits: [commit()],
    })

    expect(plan.status).toBe("draft")
    expect(plan.signal?.kind).toBe("feature")
    expect(plan.draft?.source.commitHash).toBe("abc1234")
    expect(plan.draft?.safety.requiresHumanApproval).toBe(true)
    expect(plan.draft?.safety.externalSideEffects).toEqual([])
    expect(plan.draft?.claims).toEqual([
      { kind: "repository", value: "https://github.com/Paoladev45/feedrecall" },
      { kind: "commit", value: "abc1234" },
    ])
  })

  it("stays quiet when recent changes do not justify a campaign", () => {
    const plan = planGrowthCampaign({
      ...BASE_INPUT,
      commits: [
        commit({
          subject: "Update dependencies",
          changedFiles: ["package-lock.json"],
        }),
      ],
    })

    expect(plan.status).toBe("quiet")
    expect(plan.signal).toBeNull()
    expect(plan.draft).toBeNull()
  })

  it("keeps publication approval mandatory for every channel", () => {
    const plan = planGrowthCampaign({
      ...BASE_INPUT,
      channel: "github",
      commits: [commit()],
    })

    expect(plan.draft?.channel).toBe("github")
    expect(plan.draft?.safety.requiresHumanApproval).toBe(true)
  })

  it("treats external usage as a stronger growth signal than stars alone", () => {
    const measurement = measureCampaign({
      visits: 100,
      stars: 12,
      externalUsers: 3,
      externalIssues: 1,
      contributors: 0,
      downloads: 20,
    })

    expect(measurement.outcome).toBe("adoption")
    expect(measurement.visitToStarRate).toBe(0.12)
    expect(measurement.visitToUserRate).toBe(0.03)
  })

  it("keeps conversion rates unavailable when no visits were recorded", () => {
    const measurement = measureCampaign({
      visits: 0,
      stars: 0,
      externalUsers: 0,
      externalIssues: 0,
      contributors: 0,
      downloads: 0,
    })

    expect(measurement.outcome).toBe("iterate")
    expect(measurement.visitToStarRate).toBeNull()
    expect(measurement.visitToUserRate).toBeNull()
  })
})
