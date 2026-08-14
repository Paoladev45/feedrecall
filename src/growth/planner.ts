export const growthChannels = ["x", "github", "community", "release"] as const
export type GrowthChannel = (typeof growthChannels)[number]

export const growthSignalKinds = ["feature", "bugfix", "documentation"] as const
export type GrowthSignalKind = (typeof growthSignalKinds)[number]

export type GrowthCommit = {
  readonly hash: string
  readonly authoredAt: string
  readonly subject: string
  readonly changedFiles: readonly string[]
}

export type GrowthPlanInput = {
  readonly repository: string
  readonly repositoryUrl: string
  readonly version: string
  readonly channel: GrowthChannel
  readonly asOf: string
  readonly commits: readonly GrowthCommit[]
}

export type GrowthClaim =
  | { readonly kind: "repository"; readonly value: string }
  | { readonly kind: "commit"; readonly value: string }

export type GrowthSignal = {
  readonly kind: GrowthSignalKind
  readonly code: "product_change" | "bugfix" | "documentation"
  readonly commitHash: string
  readonly changedFiles: readonly string[]
}

export type GrowthDraft = {
  readonly kind: "campaign_draft"
  readonly id: string
  readonly status: "draft"
  readonly channel: GrowthChannel
  readonly headline: string
  readonly body: string
  readonly source: {
    readonly commitHash: string
    readonly authoredAt: string
    readonly changedFiles: readonly string[]
  }
  readonly claims: readonly GrowthClaim[]
  readonly safety: {
    readonly requiresHumanApproval: true
    readonly externalSideEffects: readonly []
  }
}

export type GrowthPlan = {
  readonly kind: "growth_plan"
  readonly generatedAt: string
  readonly status: "draft" | "quiet"
  readonly signal: GrowthSignal | null
  readonly draft: GrowthDraft | null
}

const noExternalSideEffects = [] as const

function isQuietFile(file: string): boolean {
  return ["package-lock.json", "package.json", "tsconfig.json", "biome.json"].includes(file)
}

function signalFor(commit: GrowthCommit): GrowthSignal | null {
  if (commit.changedFiles.length === 0 || commit.changedFiles.every(isQuietFile)) return null

  const subject = commit.subject.toLowerCase()
  if (/\b(fix|bug|error|crash|windows|security)\b/.test(subject)) {
    return {
      kind: "bugfix",
      code: "bugfix",
      commitHash: commit.hash,
      changedFiles: commit.changedFiles,
    }
  }

  if (
    commit.changedFiles.some((file) => file.startsWith("src/") || file.startsWith("extension/"))
  ) {
    return {
      kind: "feature",
      code: "product_change",
      commitHash: commit.hash,
      changedFiles: commit.changedFiles,
    }
  }

  if (commit.changedFiles.some((file) => file === "README.md" || file.startsWith("docs/"))) {
    return {
      kind: "documentation",
      code: "documentation",
      commitHash: commit.hash,
      changedFiles: commit.changedFiles,
    }
  }

  return null
}

function limitText(value: string, limit: number): string {
  return value.length <= limit ? value : `${value.slice(0, limit - 1)}...`
}

function buildDraft(
  input: GrowthPlanInput,
  commit: GrowthCommit,
  signal: GrowthSignal,
): GrowthDraft {
  const subject = commit.subject.trim().replace(/\s+/g, " ")
  return {
    kind: "campaign_draft",
    id: `growth-${input.channel}-${commit.hash.slice(0, 12)}`,
    status: "draft",
    channel: input.channel,
    headline: limitText(`${input.repository} ${input.version}: ${subject}`, 120),
    body: limitText(
      `${input.repository} ${input.version}: ${subject}\n\n${input.repositoryUrl}`,
      280,
    ),
    source: {
      commitHash: signal.commitHash,
      authoredAt: commit.authoredAt,
      changedFiles: commit.changedFiles,
    },
    claims: [
      { kind: "repository", value: input.repositoryUrl },
      { kind: "commit", value: commit.hash },
    ],
    safety: {
      requiresHumanApproval: true,
      externalSideEffects: noExternalSideEffects,
    },
  }
}

export function planGrowthCampaign(input: GrowthPlanInput): GrowthPlan {
  const candidate = input.commits
    .map((commit) => ({ commit, signal: signalFor(commit) }))
    .find((item) => item.signal !== null)

  if (!candidate?.signal) {
    return {
      kind: "growth_plan",
      generatedAt: input.asOf,
      status: "quiet",
      signal: null,
      draft: null,
    }
  }

  return {
    kind: "growth_plan",
    generatedAt: input.asOf,
    status: "draft",
    signal: candidate.signal,
    draft: buildDraft(input, candidate.commit, candidate.signal),
  }
}
