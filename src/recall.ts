import type { MemoryRecord } from "./model.js"
import type { Vault } from "./storage/vault.js"

const evidenceWeights = {
  claimed: 1,
  observed: 2,
  verified: 3,
  tested: 4,
} as const

type RecallInput = {
  readonly query: string
  readonly project?: string | undefined
  readonly limit?: number
}

export type RecallMatch = {
  readonly memory: MemoryRecord
  readonly score: number
  readonly why: readonly string[]
}

export type RecallResult = {
  readonly query: string
  readonly project: string | null
  readonly matches: readonly RecallMatch[]
}

export function recall(vault: Vault, input: RecallInput): RecallResult {
  const memories = vault.search({
    query: input.query,
    ...(input.project ? { project: input.project } : {}),
    limit: 100,
  })
  const matches = memories
    .map((memory) => {
      const relevance = input.project
        ? memory.relevance.find((item) => item.projectSlug === input.project)
        : memory.relevance[0]
      const score =
        (relevance?.score ?? 0) * 100 +
        evidenceWeights[memory.evidence.status] * 10 +
        memory.classification.priority
      const why = [
        ...(relevance
          ? [`project: ${relevance.projectName} (${Math.round(relevance.score * 100)}%)`]
          : []),
        `evidence: ${memory.evidence.status}`,
        ...(memory.decision.status !== "undecided" ? [`decision: ${memory.decision.status}`] : []),
      ]
      return { memory, score, why } satisfies RecallMatch
    })
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score
      const leftDate = left.memory.source.published_at ?? left.memory.firstSeenAt
      const rightDate = right.memory.source.published_at ?? right.memory.firstSeenAt
      return rightDate.localeCompare(leftDate)
    })
    .slice(0, input.limit ?? 10)

  return {
    query: input.query,
    project: input.project ?? null,
    matches,
  }
}
