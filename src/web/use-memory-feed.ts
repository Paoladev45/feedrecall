import { useEffect, useState } from "react"
import { api } from "./api.js"
import type {
  Memory,
  ObsolescenceResult,
  Project,
  Stats,
  Timeline,
  TimelineDateField,
  TimelineGroupBy,
} from "./types.js"

const emptyStats: Stats = { memories: 0, projects: 0, needsReview: 0, tested: 0 }
const emptyTimeline: Timeline = {
  dateField: "published",
  groupBy: "month",
  project: null,
  total: 0,
  groups: [],
  undated: [],
}
const emptyObsolescence: ObsolescenceResult = {
  asOf: new Date(0).toISOString(),
  assessments: [],
  counts: { fresh: 0, watch: 0, likely_expired: 0, likely_replaced: 0 },
}

export function useMemoryFeed() {
  const [memories, setMemories] = useState<readonly Memory[]>([])
  const [projects, setProjects] = useState<readonly Project[]>([])
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null)
  const [stats, setStats] = useState<Stats>(emptyStats)
  const [query, setQuery] = useState("")
  const [evidence, setEvidence] = useState("")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [timeline, setTimeline] = useState<Timeline>(emptyTimeline)
  const [obsolescence, setObsolescence] = useState<ObsolescenceResult>(emptyObsolescence)
  const [dateField, setDateField] = useState<TimelineDateField>("published")
  const [groupBy, setGroupBy] = useState<TimelineGroupBy>("month")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setSelectedMemory(null)
    setSelectedId(null)
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      Promise.all([
        api.memories(query, evidence, controller.signal),
        api.stats(controller.signal),
        api.projects(controller.signal),
      ])
        .then(([nextMemories, nextStats, nextProjects]) => {
          if (controller.signal.aborted) return
          setMemories(nextMemories)
          setStats(nextStats)
          setProjects(nextProjects)
          const firstMemory = nextMemories[0] ?? null
          setSelectedMemory(firstMemory)
          setSelectedId(firstMemory?.id ?? null)
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

  const selectMemory = (memory: Memory): void => {
    setSelectedMemory(memory)
    setSelectedId(memory.id)
  }

  const inspectMemory = async (id: string): Promise<void> => {
    const visibleMemory = memories.find((memory) => memory.id === id)
    if (visibleMemory) {
      selectMemory(visibleMemory)
      return
    }
    try {
      const loadedMemory = await api.memory(id)
      setSelectedMemory(loadedMemory)
      setSelectedId(loadedMemory.id)
      setError(null)
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Unable to load memory detail")
    }
  }

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([
      api.timeline(dateField, groupBy, controller.signal),
      api.obsolescence(controller.signal),
    ])
      .then(([nextTimeline, nextObsolescence]) => {
        if (controller.signal.aborted) return
        setTimeline(nextTimeline)
        setObsolescence(nextObsolescence)
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return
        setError(reason instanceof Error ? reason.message : "Unable to load analysis")
      })
    return () => controller.abort()
  }, [dateField, groupBy])

  return {
    memories,
    projects,
    selectedMemory,
    stats,
    query,
    setQuery,
    evidence,
    setEvidence,
    selectedId,
    setSelectedId,
    selectMemory,
    inspectMemory,
    timeline,
    obsolescence,
    dateField,
    setDateField,
    groupBy,
    setGroupBy,
    error,
  }
}
