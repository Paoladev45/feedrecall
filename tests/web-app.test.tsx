// @vitest-environment jsdom

import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { Memory, Stats } from "../src/web/types.js"

const apiMocks = vi.hoisted(() => ({
  memories: vi.fn(),
  stats: vi.fn(),
}))

vi.mock("../src/web/api.js", () => ({ api: apiMocks }))

import { App } from "../src/web/App.js"

type PendingRequest = {
  readonly evidence: string
  readonly signal: AbortSignal | undefined
  readonly resolve: (memories: readonly Memory[]) => void
}

const stats: Stats = { memories: 2, projects: 1, needsReview: 2, tested: 0 }

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
    apiMocks.stats.mockReset().mockResolvedValue(stats)
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
})
