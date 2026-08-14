import { z } from "zod"
import type { MemoryRecord } from "./model.js"
import { findReplacement, freshnessProfile } from "./obsolescence-heuristics.js"

export const obsolescenceStatuses = ["fresh", "watch", "likely_expired", "likely_replaced"] as const
export const obsolescenceRecommendations = ["keep", "review", "archive_candidate"] as const

export type ObsolescenceStatus = (typeof obsolescenceStatuses)[number]
export type ObsolescenceRecommendation = (typeof obsolescenceRecommendations)[number]

export type ObsolescenceInput = {
  readonly asOf?: string
  readonly limit?: number
}

export const ObsolescenceInputSchema = z.object({
  asOf: z.iso.datetime({ offset: true }).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(500),
})

export type ObsolescenceAssessment = {
  readonly memoryId: string
  readonly title: string
  readonly sourceUrl: string
  readonly publishedAt: string | null
  readonly dateBasis: "published" | "first_seen"
  readonly ageDays: number
  readonly freshnessWindowDays: number
  readonly status: ObsolescenceStatus
  readonly recommendation: ObsolescenceRecommendation
  readonly confidence: number
  readonly reasons: readonly string[]
  readonly relatedMemoryId?: string
  readonly relatedTitle?: string
}

export type ObsolescenceCounts = Readonly<Record<ObsolescenceStatus, number>>

export type ObsolescenceResult = {
  readonly asOf: string
  readonly assessments: readonly ObsolescenceAssessment[]
  readonly counts: ObsolescenceCounts
}

export function assessObsolescence(
  memories: readonly MemoryRecord[],
  input: ObsolescenceInput = {},
): ObsolescenceResult {
  const parsed = ObsolescenceInputSchema.parse(input)
  const asOf = parsed.asOf ?? new Date().toISOString()
  const assessments = memories
    .slice(0, parsed.limit)
    .map((memory) => assessMemory(memory, memories, asOf))
    .sort(
      (left, right) =>
        rankStatus(right.status) - rankStatus(left.status) || right.ageDays - left.ageDays,
    )

  return {
    asOf,
    assessments,
    counts: {
      fresh: assessments.filter((item) => item.status === "fresh").length,
      watch: assessments.filter((item) => item.status === "watch").length,
      likely_expired: assessments.filter((item) => item.status === "likely_expired").length,
      likely_replaced: assessments.filter((item) => item.status === "likely_replaced").length,
    },
  }
}

function assessMemory(
  memory: MemoryRecord,
  memories: readonly MemoryRecord[],
  asOf: string,
): ObsolescenceAssessment {
  const profile = freshnessProfile(memory)
  const sourceDate = memory.source.published_at ?? memory.firstSeenAt
  const dateBasis = memory.source.published_at ? "published" : "first_seen"
  const ageDays = Math.max(0, Math.floor((Date.parse(asOf) - Date.parse(sourceDate)) / 86_400_000))
  const candidate = findReplacement(memory, memories)
  const protectedEvidence =
    memory.evidence.status === "tested" || memory.decision.status === "adopted"
  const reasons = [`${profile.label} content uses a ${profile.windowDays}-day freshness window.`]
  let status: ObsolescenceStatus = "fresh"
  let recommendation: ObsolescenceRecommendation = "keep"
  let confidence = 0.55

  if (memory.decision.status === "adopted") {
    reasons.push("It is marked adopted in the local project history.")
    status = "watch"
    recommendation = "review"
    confidence = 0.92
  } else if (candidate && ageDays >= 30) {
    reasons.push("A newer related discovery has stronger replacement signals.")
    status = protectedEvidence ? "watch" : "likely_replaced"
    recommendation = protectedEvidence ? "review" : "archive_candidate"
    confidence = protectedEvidence ? 0.72 : Math.min(0.94, 0.62 + candidate.score * 0.25)
  } else if (profile.kind === "volatile" && ageDays >= profile.windowDays) {
    reasons.push(
      `It is ${ageDays} days old, beyond the expected ${profile.windowDays}-day validity window.`,
    )
    status = protectedEvidence ? "watch" : "likely_expired"
    recommendation = protectedEvidence ? "review" : "archive_candidate"
    confidence = protectedEvidence ? 0.68 : 0.88
  } else if (ageDays >= profile.windowDays * 0.7) {
    reasons.push(`It is ${ageDays} days old and approaching the freshness boundary.`)
    status = "watch"
    recommendation = "review"
    confidence = 0.64
  }

  if (memory.evidence.status === "tested") {
    reasons.push("Local evidence is tested, so age alone must not trigger deletion.")
    if (status === "fresh") confidence = Math.max(confidence, 0.82)
  }
  if (profile.kind === "durable")
    reasons.push("Its topic looks conceptual rather than time-limited.")

  return {
    memoryId: memory.id,
    title: memory.content.title,
    sourceUrl: memory.source.url,
    publishedAt: memory.source.published_at,
    dateBasis,
    ageDays,
    freshnessWindowDays: profile.windowDays,
    status,
    recommendation,
    confidence: Math.round(confidence * 100) / 100,
    reasons,
    ...(candidate
      ? { relatedMemoryId: candidate.memory.id, relatedTitle: candidate.memory.content.title }
      : {}),
  }
}

function rankStatus(status: ObsolescenceStatus): number {
  if (status === "likely_replaced") return 4
  if (status === "likely_expired") return 3
  if (status === "watch") return 2
  return 1
}
