import type { MemoryRecord } from "./model.js"

export type FreshnessProfile = {
  readonly kind: "volatile" | "evolving" | "durable" | "default"
  readonly label: string
  readonly windowDays: number
}

export type ReplacementCandidate = {
  readonly memory: MemoryRecord
  readonly similarity: number
  readonly signal: boolean
  readonly score: number
}

const volatilePatterns = [
  /\b(?:pricing|price|quota|availability|promotion|discount|trial)\b/u,
  /\b(?:rate[- ]?limit|limited[- ]time|temporary|expires?)\b/u,
  /\b(?:free|paid)\s+(?:tier|plan|access|credits?|tokens?|subscription)\b/u,
  /\bfree\s+(?:for|during)\s+\d+\s+(?:days?|weeks?|months?)\b/u,
  /\bfor\s+free\b/u,
] as const

const durableTerms = [
  "architecture",
  "principle",
  "pattern",
  "algorithm",
  "security",
  "design",
  "theory",
  "concept",
  "mental-model",
] as const

const evolvingTerms = [
  "codex",
  "claude",
  "cursor",
  "openrouter",
  "model",
  "api",
  "mcp",
  "sdk",
  "integration",
  "workflow",
  "prompt",
  "release",
  "version",
  "tool",
] as const

const replacementTerms = [
  "new",
  "newer",
  "better",
  "replace",
  "replaces",
  "replacement",
  "alternative",
  "improved",
  "release",
  "version",
  "v2",
] as const

const ignoredTerms = new Set([
  "this",
  "that",
  "with",
  "from",
  "into",
  "have",
  "your",
  "same",
  "more",
  "than",
  "for",
  "the",
  "and",
  "les",
  "des",
  "une",
  "pour",
  "avec",
  "dans",
])

export function freshnessProfile(memory: MemoryRecord): FreshnessProfile {
  const text = searchableText(memory)
  if (volatilePatterns.some((pattern) => pattern.test(text))) {
    return { kind: "volatile", label: "Pricing, quota, or availability", windowDays: 14 }
  }
  if (durableTerms.some((term) => text.includes(term))) {
    return { kind: "durable", label: "Conceptual or architectural", windowDays: 365 }
  }
  if (evolvingTerms.some((term) => text.includes(term))) {
    return { kind: "evolving", label: "Fast-moving tool or workflow", windowDays: 60 }
  }
  return { kind: "default", label: "General discovery", windowDays: 120 }
}

export function findReplacement(
  memory: MemoryRecord,
  memories: readonly MemoryRecord[],
): ReplacementCandidate | null {
  const currentDate = Date.parse(memory.source.published_at ?? memory.firstSeenAt)
  const currentTerms = termsFor(memory)
  const candidates = memories
    .filter((candidate) => candidate.id !== memory.id)
    .map((candidate) => {
      const candidateDate = Date.parse(candidate.source.published_at ?? candidate.firstSeenAt)
      const similarity = similarityOf(currentTerms, termsFor(candidate))
      const signal = replacementTerms.some((term) => containsTerm(searchableText(candidate), term))
      const sharedTopics = memory.classification.topics.filter((topic) =>
        candidate.classification.topics.some(
          (other) => other.toLowerCase() === topic.toLowerCase(),
        ),
      ).length
      const score = similarity + (signal ? 0.18 : 0) + Math.min(sharedTopics, 3) * 0.08
      return { memory: candidate, similarity, signal, score, candidateDate, sharedTopics }
    })
    .filter(
      (candidate) =>
        candidate.candidateDate > currentDate &&
        candidate.candidateDate <= currentDate + 180 * 86_400_000 &&
        ((candidate.signal && candidate.similarity >= 0.24 && candidate.sharedTopics >= 1) ||
          (candidate.similarity >= 0.4 && candidate.sharedTopics >= 2)),
    )
    .sort((left, right) => right.score - left.score || right.candidateDate - left.candidateDate)
  const best = candidates[0]
  return best
    ? { memory: best.memory, similarity: best.similarity, signal: best.signal, score: best.score }
    : null
}

function termsFor(memory: MemoryRecord): ReadonlySet<string> {
  return new Set(
    searchableText(memory)
      .match(/[\p{L}\p{N}]+/gu)
      ?.filter((term) => term.length >= 3 && !ignoredTerms.has(term)) ?? [],
  )
}

function similarityOf(left: ReadonlySet<string>, right: ReadonlySet<string>): number {
  const union = new Set([...left, ...right])
  if (union.size === 0) return 0
  const shared = [...left].filter((term) => right.has(term)).length
  return shared / union.size
}

export function searchableText(memory: MemoryRecord): string {
  return `${memory.content.title} ${memory.content.text} ${memory.classification.topics.join(" ")}`.toLowerCase()
}

function containsTerm(text: string, term: string): boolean {
  return new RegExp(`(?:^|[^\\p{L}\\p{N}_])${escapeRegExp(term)}(?:$|[^\\p{L}\\p{N}_])`, "u").test(
    text,
  )
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")
}
