import { describe, expect, it } from "vitest"
import { type ImportedRecord, type MemoryRecord, materializeRecord } from "../src/model.js"
import { assessObsolescence } from "../src/obsolescence.js"

const AS_OF = "2026-08-14T12:00:00.000Z"

function record(input: {
  readonly id: string
  readonly title: string
  readonly text: string
  readonly topics: readonly string[]
  readonly publishedAt: string
  readonly evidence?: "claimed" | "tested"
}): MemoryRecord {
  const imported: ImportedRecord = {
    source: {
      platform: "x",
      type: "like",
      external_id: input.id,
      url: `https://x.com/example/status/${input.id}`,
      author: "Example",
      published_at: input.publishedAt,
    },
    content: {
      title: input.title,
      text: input.text,
      external_links: [],
      media: [],
    },
    classification: { topics: [...input.topics], priority: 4 },
    evidence: {
      status: input.evidence ?? "claimed",
      confidence: input.evidence === "tested" ? 0.95 : 0.45,
    },
  }
  return materializeRecord(imported, input.publishedAt)
}

describe("obsolescence", () => {
  it("flags a volatile free-tier post after its short freshness window", () => {
    const memory = record({
      id: "openrouter-free",
      title: "OpenRouter free subscription tier",
      text: "Use this free tier and its current quota for two weeks.",
      topics: ["openrouter", "pricing"],
      publishedAt: "2026-07-20T12:00:00.000Z",
    })

    const result = assessObsolescence([memory], { asOf: AS_OF })

    expect(result.assessments[0]?.status).toBe("likely_expired")
    expect(result.assessments[0]?.recommendation).toBe("archive_candidate")
    expect(result.assessments[0]?.reasons.join(" ")).toContain("14-day")
  })

  it("marks an older evolving tool tip as replaced by a newer related discovery", () => {
    const oldTip = record({
      id: "codex-old",
      title: "Improve Codex with a context prompt",
      text: "This workflow improves Codex responses.",
      topics: ["codex", "workflow"],
      publishedAt: "2026-05-20T12:00:00.000Z",
    })
    const newTip = record({
      id: "codex-new",
      title: "New better Codex workflow replaces the old prompt",
      text: "A newer release improves the same Codex workflow.",
      topics: ["codex", "workflow"],
      publishedAt: "2026-08-01T12:00:00.000Z",
      evidence: "tested",
    })

    const result = assessObsolescence([oldTip, newTip], { asOf: AS_OF })
    const assessment = result.assessments.find((item) => item.memoryId === oldTip.id)

    expect(assessment?.status).toBe("likely_replaced")
    expect(assessment?.relatedMemoryId).toBe(newTip.id)
    expect(assessment?.reasons.join(" ")).toContain("newer related discovery")
  })

  it("keeps a durable tested concept as a review signal instead of deletion", () => {
    const memory = record({
      id: "agent-principle",
      title: "Principles for reliable agent memory",
      text: "A durable architecture principle for evidence and provenance.",
      topics: ["architecture", "memory"],
      publishedAt: "2025-01-01T12:00:00.000Z",
      evidence: "tested",
    })

    const result = assessObsolescence([memory], { asOf: AS_OF })

    expect(result.assessments[0]?.status).toBe("watch")
    expect(result.assessments[0]?.recommendation).toBe("review")
    expect(result.assessments[0]?.reasons.join(" ")).toContain("tested")
  })

  it("does not treat every use of the word free as a temporary offer", () => {
    const memory = record({
      id: "free-open-source-guide",
      title: "Free open-source guide for agent workflows",
      text: "A free guide explains durable patterns for building reliable agent workflows.",
      topics: ["architecture", "agents"],
      publishedAt: "2026-07-01T12:00:00.000Z",
    })

    const result = assessObsolescence([memory], { asOf: AS_OF })

    expect(result.assessments[0]?.status).toBe("fresh")
    expect(result.assessments[0]?.freshnessWindowDays).toBe(365)
  })
})
