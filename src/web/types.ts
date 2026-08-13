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
