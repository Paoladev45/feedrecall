import { useEffect, useState } from "react"
import { api } from "./api.js"
import type { Memory, Stats } from "./types.js"

const emptyStats: Stats = { memories: 0, projects: 0, needsReview: 0, tested: 0 }

export function useMemoryFeed() {
  const [memories, setMemories] = useState<readonly Memory[]>([])
  const [stats, setStats] = useState<Stats>(emptyStats)
  const [query, setQuery] = useState("")
  const [evidence, setEvidence] = useState("")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      Promise.all([api.memories(query, evidence, controller.signal), api.stats()])
        .then(([nextMemories, nextStats]) => {
          if (controller.signal.aborted) return
          setMemories(nextMemories)
          setStats(nextStats)
          setSelectedId((current) => current ?? nextMemories[0]?.id ?? null)
          setError(null)
        })
        .catch((reason: unknown) => {
          if (controller.signal.aborted) return
          setError(reason instanceof Error ? reason.message : "Unable to load memory")
        })
    }, 120)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [query, evidence])

  return {
    memories,
    stats,
    query,
    setQuery,
    evidence,
    setEvidence,
    selectedId,
    setSelectedId,
    error,
  }
}
