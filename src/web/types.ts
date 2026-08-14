export type Relevance = {
  readonly projectSlug: string
  readonly projectName: string
  readonly score: number
  readonly reasons: readonly string[]
}

export type Memory = {
  readonly id: string
  readonly source: {
    readonly platform: string
    readonly type: string
    readonly url: string
    readonly author: string
    readonly published_at: string | null
  }
  readonly content: {
    readonly title: string
    readonly text: string
    readonly external_links: readonly string[]
    readonly media: readonly string[]
  }
  readonly classification: { readonly topics: readonly string[]; readonly priority: number }
  readonly knowledge: {
    readonly summary: string | null
    readonly possibleUses: readonly string[]
  }
  readonly processing: { readonly status: string }
  readonly evidence: { readonly status: string; readonly confidence: number }
  readonly decision: { readonly status: string; readonly reason: string | null }
  readonly firstSeenAt: string
  readonly lastSeenAt: string
  readonly relevance: readonly Relevance[]
}

export type Stats = {
  readonly memories: number
  readonly projects: number
  readonly needsReview: number
  readonly tested: number
}

export type ProjectStatus = "idea" | "active" | "paused" | "completed"

export type Project = {
  readonly slug: string
  readonly name: string
  readonly description: string
  readonly goals: readonly string[]
  readonly technologies: readonly string[]
  readonly repositories: readonly string[]
  readonly status: ProjectStatus
}

export type TimelineDateField = "published" | "first_seen" | "last_seen"
export type TimelineGroupBy = "day" | "week" | "month"

export type Timeline = {
  readonly dateField: TimelineDateField
  readonly groupBy: TimelineGroupBy
  readonly project: string | null
  readonly total: number
  readonly groups: readonly {
    readonly key: string
    readonly label: string
    readonly items: readonly { readonly date: string; readonly memory: Memory }[]
  }[]
  readonly undated: readonly { readonly date: null; readonly memory: Memory }[]
}

export type ObsolescenceStatus = "fresh" | "watch" | "likely_expired" | "likely_replaced"
export type ObsolescenceRecommendation = "keep" | "review" | "archive_candidate"

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
  readonly relatedMemoryId: string | undefined
  readonly relatedTitle: string | undefined
}

export type ObsolescenceResult = {
  readonly asOf: string
  readonly assessments: readonly ObsolescenceAssessment[]
  readonly counts: Readonly<Record<ObsolescenceStatus, number>>
}
