import type { decisionStatuses, evidenceStatuses, processingStatuses } from "../model.js"

export type SearchInput = {
  readonly query: string
  readonly publishedAfter?: string
  readonly publishedBefore?: string
  readonly project?: string
  readonly evidence?: string
  readonly limit?: number
}

export const timelineDateFields = ["published", "first_seen", "last_seen"] as const
export const timelineGroupings = ["day", "week", "month"] as const

export type TimelineDateField = (typeof timelineDateFields)[number]
export type TimelineGroupBy = (typeof timelineGroupings)[number]

export type TimelineInput = {
  readonly dateField?: TimelineDateField
  readonly groupBy?: TimelineGroupBy
  readonly project?: string
  readonly after?: string
  readonly before?: string
  readonly limit?: number
}

export type ResolvedTimelineInput = {
  readonly dateField: TimelineDateField
  readonly groupBy: TimelineGroupBy
  readonly project: string | null
  readonly after?: string
  readonly before?: string
  readonly limit: number
}

export type ImportCounts = {
  readonly inserted: number
  readonly updated: number
  readonly unchanged: number
}

export type MarkInput =
  | {
      readonly dimension: "processing"
      readonly status: (typeof processingStatuses)[number]
      readonly reason: string
    }
  | {
      readonly dimension: "evidence"
      readonly status: (typeof evidenceStatuses)[number]
      readonly reason: string
    }
  | {
      readonly dimension: "decision"
      readonly status: (typeof decisionStatuses)[number]
      readonly reason: string
    }

export type LifecycleEvent = {
  readonly dimension: string
  readonly fromStatus: string
  readonly toStatus: string
  readonly reason: string | null
  readonly occurredAt: string
}

export type VaultStats = {
  readonly memories: number
  readonly projects: number
  readonly needsReview: number
  readonly tested: number
}
