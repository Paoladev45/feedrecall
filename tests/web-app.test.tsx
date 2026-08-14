// @vitest-environment jsdom

import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { Memory, ObsolescenceResult, Stats, Timeline } from "../src/web/types.js"

const apiMocks = vi.hoisted(() => ({
  memories: vi.fn(),
  memory: vi.fn(),
  stats: vi.fn(),
  projects: vi.fn(),
  timeline: vi.fn(),
  obsolescence: vi.fn(),
}))

vi.mock("../src/web/api.js", () => ({ api: apiMocks }))

import { App } from "../src/web/App.js"

type PendingRequest = {
  readonly evidence: string
  readonly signal: AbortSignal | undefined
  readonly resolve: (memories: readonly Memory[]) => void
}

const stats: Stats = { memories: 2, projects: 1, needsReview: 2, tested: 0 }

const emptyTimeline: Timeline = {
  dateField: "published",
  groupBy: "month",
  project: null,
  total: 0,
  groups: [],
  undated: [],
}

const emptyObsolescence: ObsolescenceResult = {
  asOf: "2026-08-14T12:00:00.000Z",
  assessments: [],
  counts: { fresh: 0, watch: 0, likely_expired: 0, likely_replaced: 0 },
}

function memory(id: string, evidence: string): Memory {
  return {
    id,
    source: {
      platform: "x",
      type: "like",
      url: `https://example.com/${id}`,
      author: "Example",
      published_at: "2026-08-01T10:00:00.000Z",
    },
    content: {
      title: `Discovery ${id}`,
      text: "A project-aware memory",
      external_links: [],
      media: [],
    },
    classification: { topics: ["memory"], priority: 4 },
    knowledge: { summary: null, possibleUses: [] },
    processing: { status: "reviewed" },
    evidence: { status: evidence, confidence: 0.8 },
    decision: { status: "undecided", reason: null },
    firstSeenAt: "2026-08-01T10:00:00.000Z",
    lastSeenAt: "2026-08-01T10:00:00.000Z",
    relevance: [
      { projectSlug: "feedrecall", projectName: "FeedRecall", score: 0.9, reasons: ["memory"] },
    ],
  }
}

function requiredRequest(requests: readonly PendingRequest[], evidence: string): PendingRequest {
  const request = requests.find((candidate) => candidate.evidence === evidence)
  if (!request) throw new TypeError(`Missing request for ${evidence || "all evidence"}`)
  return request
}

describe("FeedRecall cockpit", () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    vi.useFakeTimers()
    Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", {
      configurable: true,
      value: true,
    })
    apiMocks.memories.mockReset()
    apiMocks.memory.mockReset()
    apiMocks.stats.mockReset().mockResolvedValue(stats)
    apiMocks.projects.mockReset().mockResolvedValue([])
    apiMocks.timeline.mockReset().mockResolvedValue(emptyTimeline)
    apiMocks.obsolescence.mockReset().mockResolvedValue(emptyObsolescence)
    container = document.createElement("div")
    document.body.append(container)
    root = createRoot(container)
  })

  afterEach(async () => {
    await act(async () => root.unmount())
    container.remove()
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it("keeps the latest filtered result when an older request finishes last", async () => {
    // Given: an unfiltered request that remains pending while a verified filter is selected.
    const requests: PendingRequest[] = []
    apiMocks.memories.mockImplementation(
      (_query: string, evidence: string, signal?: AbortSignal) =>
        new Promise<readonly Memory[]>((resolve) => requests.push({ evidence, signal, resolve })),
    )
    await act(async () => root.render(<App />))
    await act(async () => vi.advanceTimersByTimeAsync(120))
    const evidenceFilter = container.querySelector("#evidence-filter")
    if (!(evidenceFilter instanceof HTMLSelectElement)) {
      throw new TypeError("Evidence filter is missing")
    }

    // When: the verified response arrives first and the superseded response arrives afterward.
    await act(async () => {
      evidenceFilter.value = "verified"
      evidenceFilter.dispatchEvent(new Event("change", { bubbles: true }))
    })
    await act(async () => vi.advanceTimersByTimeAsync(120))
    const initialRequest = requiredRequest(requests, "")
    const verifiedRequest = requiredRequest(requests, "verified")
    await act(async () => verifiedRequest.resolve([memory("verified", "verified")]))
    await act(async () => initialRequest.resolve([memory("claimed", "claimed")]))

    // Then: the visible row still belongs to the active filter and the stale fetch was aborted.
    expect(initialRequest.signal?.aborted).toBe(true)
    expect(container.textContent).toContain("1 discoveries")
    expect(container.textContent).toContain("Discovery verified")
    expect(container.textContent).not.toContain("Discovery claimed")
  })

  it("moves focus to the updated detail after Inspect on a stacked viewport", async () => {
    // Given: an opportunity displayed on a tablet-sized stacked layout.
    apiMocks.memories.mockResolvedValue([memory("verified", "verified")])
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: (query: string) => ({
        matches: query === "(max-width: 900px)",
        media: query,
        onchange: null,
        addListener: () => undefined,
        removeListener: () => undefined,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        dispatchEvent: () => true,
      }),
    })
    const scrollIntoView = vi.fn()
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: scrollIntoView,
    })
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      callback(0)
      return 1
    })
    await act(async () => root.render(<App />))
    await act(async () => vi.advanceTimersByTimeAsync(120))
    const inspect = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent === "Inspect",
    )
    if (!inspect) throw new TypeError("Inspect button is missing")

    // When: the user inspects the opportunity.
    await act(async () => inspect.click())

    // Then: the detail pane is brought into view and receives programmatic focus.
    const detail = container.querySelector(".detail-pane")
    expect(scrollIntoView).toHaveBeenCalledOnce()
    expect(document.activeElement).toBe(detail)
  })

  it("shows the chronology and review signals returned by the analysis APIs", async () => {
    const trail = memory("trail", "claimed")
    apiMocks.memories.mockResolvedValue([trail])
    apiMocks.timeline.mockResolvedValue({
      ...emptyTimeline,
      total: 1,
      groups: [
        {
          key: "2026-08",
          label: "August 2026",
          items: [{ date: "2026-08-01T10:00:00.000Z", memory: trail }],
        },
      ],
    } satisfies Timeline)
    apiMocks.obsolescence.mockResolvedValue({
      ...emptyObsolescence,
      assessments: [
        {
          memoryId: trail.id,
          title: trail.content.title,
          sourceUrl: trail.source.url,
          publishedAt: trail.source.published_at,
          dateBasis: "published",
          ageDays: 42,
          freshnessWindowDays: 60,
          status: "watch",
          recommendation: "review",
          confidence: 0.64,
          reasons: ["Fast-moving tool or workflow content uses a 60-day freshness window."],
          relatedMemoryId: undefined,
          relatedTitle: undefined,
        },
      ],
      counts: { fresh: 0, watch: 1, likely_expired: 0, likely_replaced: 0 },
    } satisfies ObsolescenceResult)

    await act(async () => root.render(<App />))
    await act(async () => vi.advanceTimersByTimeAsync(120))

    expect(container.textContent).toContain("Your discovery trail")
    expect(container.textContent).toContain("August 2026")
    expect(container.textContent).toContain("Review signals")
    expect(container.textContent).toContain("1 watch")
  })

  it("loads a timeline item that is outside the active memory filter", async () => {
    const visible = memory("visible", "verified")
    const hidden = memory("hidden", "claimed")
    apiMocks.memories.mockResolvedValue([visible])
    apiMocks.timeline.mockResolvedValue({
      ...emptyTimeline,
      total: 2,
      groups: [
        {
          key: "2026-08",
          label: "August 2026",
          items: [
            { date: visible.firstSeenAt, memory: visible },
            { date: hidden.firstSeenAt, memory: hidden },
          ],
        },
      ],
    } satisfies Timeline)
    apiMocks.memory.mockResolvedValue(hidden)

    await act(async () => root.render(<App />))
    await act(async () => vi.advanceTimersByTimeAsync(120))

    const hiddenTimelineItem = Array.from(container.querySelectorAll(".timeline-item")).find(
      (button) => button.textContent?.includes("Discovery hidden"),
    )
    if (!(hiddenTimelineItem instanceof HTMLButtonElement)) {
      throw new TypeError("Hidden timeline item is missing")
    }

    await act(async () => hiddenTimelineItem.click())

    expect(apiMocks.memory).toHaveBeenCalledWith("hidden")
    expect(container.textContent).toContain("Discovery hidden")
    expect(container.querySelector(".detail-pane")?.textContent).toContain("Discovery hidden")
  })

  it("refreshes the timeline when its grouping control changes", async () => {
    apiMocks.memories.mockResolvedValue([memory("timeline", "verified")])

    await act(async () => root.render(<App />))
    await act(async () => vi.advanceTimersByTimeAsync(120))

    const groupBy = Array.from(container.querySelectorAll(".timeline-band select"))[1]
    if (!(groupBy instanceof HTMLSelectElement)) throw new TypeError("Group-by control is missing")

    await act(async () => {
      groupBy.value = "day"
      groupBy.dispatchEvent(new Event("change", { bubbles: true }))
    })

    expect(apiMocks.timeline).toHaveBeenLastCalledWith("published", "day", expect.any(AbortSignal))
  })

  it("reveals every timeline period and every discovery when requested", async () => {
    const firstPeriodItems = ["one", "two", "three", "four"].map((id) => ({
      date: `2026-08-0${id === "one" ? 1 : id === "two" ? 2 : id === "three" ? 3 : 4}T10:00:00.000Z`,
      memory: memory(id, "claimed"),
    }))
    const periods = Array.from({ length: 9 }, (_, index) => ({
      key: `2026-${String(8 - Math.floor(index / 2)).padStart(2, "0")}-${index + 1}`,
      label: `Period ${index + 1}`,
      items:
        index === 0
          ? firstPeriodItems
          : [{ date: "2026-07-01T10:00:00.000Z", memory: memory(`period-${index}`, "claimed") }],
    }))
    apiMocks.memories.mockResolvedValue([memory("one", "claimed")])
    apiMocks.timeline.mockResolvedValue({
      ...emptyTimeline,
      total: 12,
      groups: periods,
    } satisfies Timeline)

    await act(async () => root.render(<App />))
    await act(async () => vi.advanceTimersByTimeAsync(120))

    expect(container.textContent).not.toContain("Period 9")
    expect(container.textContent).not.toContain("Discovery four")

    const showPeriods = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Show all 9 periods"),
    )
    if (!(showPeriods instanceof HTMLButtonElement))
      throw new TypeError("Show-periods button is missing")
    await act(async () => showPeriods.click())

    const showDiscoveries = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Show 1 more discoveries"),
    )
    if (!(showDiscoveries instanceof HTMLButtonElement)) {
      throw new TypeError("Show-discoveries button is missing")
    }
    await act(async () => showDiscoveries.click())

    expect(container.textContent).toContain("Period 9")
    expect(container.textContent).toContain("Discovery four")
  })

  it("renders a dedicated projects destination from the projects API", async () => {
    apiMocks.memories.mockResolvedValue([memory("project-memory", "verified")])
    apiMocks.projects.mockResolvedValue([
      {
        slug: "feedrecall",
        name: "FeedRecall",
        description: "Project-aware memory for saved discoveries.",
        goals: ["Keep knowledge current"],
        technologies: ["TypeScript", "MCP"],
        repositories: ["https://github.com/Paoladev45/feedrecall"],
        status: "active",
      },
    ])

    await act(async () => root.render(<App />))
    await act(async () => vi.advanceTimersByTimeAsync(120))

    const projects = container.querySelector("#projects")
    expect(projects).toBeInstanceOf(HTMLElement)
    expect(projects?.textContent).toContain("FeedRecall")
    expect(projects?.textContent).toContain("Active")
    expect(projects?.textContent).toContain("TypeScript")
    expect(
      projects?.querySelector('a[href="https://github.com/Paoladev45/feedrecall"]'),
    ).toBeTruthy()
    expect(container.querySelectorAll("#projects")).toHaveLength(1)
  })

  it("keeps Sources navigation anchored to the selected detail pane", async () => {
    apiMocks.memories.mockResolvedValue([memory("source-anchor", "claimed")])

    await act(async () => root.render(<App />))
    await act(async () => vi.advanceTimersByTimeAsync(120))

    const sources = container.querySelector('a[aria-label="Sources"]')
    expect(sources?.getAttribute("href")).toBe("#source-detail")
    expect(container.querySelector("#source-detail")).toBeInstanceOf(HTMLElement)
    expect(container.querySelectorAll("#source-detail")).toHaveLength(1)
  })
})
