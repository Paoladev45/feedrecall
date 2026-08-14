import { z } from "zod"
import type { MemoryRecord } from "./model.js"
import {
  type ResolvedTimelineInput,
  type TimelineDateField,
  type TimelineGroupBy,
  type TimelineInput,
  timelineDateFields,
  timelineGroupings,
} from "./storage/types.js"

export const timelineBoundarySchema = z.union([z.iso.date(), z.iso.datetime({ offset: true })])

export const TimelineInputSchema = z.object({
  dateField: z.enum(timelineDateFields).default("published"),
  groupBy: z.enum(timelineGroupings).default("day"),
  project: z.string().min(1).optional(),
  after: timelineBoundarySchema.optional(),
  before: timelineBoundarySchema.optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
})

export type TimelineItem = {
  readonly date: string
  readonly memory: MemoryRecord
}

export type UndatedTimelineItem = {
  readonly date: null
  readonly memory: MemoryRecord
}

export type TimelineGroup = {
  readonly key: string
  readonly label: string
  readonly items: readonly TimelineItem[]
}

export type TimelineResult = {
  readonly dateField: TimelineDateField
  readonly groupBy: TimelineGroupBy
  readonly project: string | null
  readonly total: number
  readonly groups: readonly TimelineGroup[]
  readonly undated: readonly UndatedTimelineItem[]
}

export function resolveTimelineInput(input: TimelineInput): ResolvedTimelineInput {
  const parsed = TimelineInputSchema.parse(input)
  const after = parsed.after ? normalizeBoundary(parsed.after, false) : undefined
  const before = parsed.before ? normalizeBoundary(parsed.before, true) : undefined

  if (after && before && Date.parse(after) > Date.parse(before)) {
    throw new Error("Timeline 'after' must be earlier than or equal to 'before'")
  }

  return {
    dateField: parsed.dateField,
    groupBy: parsed.groupBy,
    project: parsed.project ?? null,
    ...(after ? { after } : {}),
    ...(before ? { before } : {}),
    limit: parsed.limit,
  }
}

export function buildTimeline(
  memories: readonly MemoryRecord[],
  input: ResolvedTimelineInput,
): TimelineResult {
  const grouped = new Map<string, TimelineItem[]>()
  const undated: UndatedTimelineItem[] = []

  for (const memory of memories) {
    const date = dateFor(memory, input.dateField)
    if (!date || Number.isNaN(Date.parse(date))) {
      undated.push({ date: null, memory })
      continue
    }

    const key = groupKey(date, input.groupBy)
    if (!key) {
      undated.push({ date: null, memory })
      continue
    }
    const item = { date, memory } satisfies TimelineItem
    const items = grouped.get(key)
    if (items) items.push(item)
    else grouped.set(key, [item])
  }

  return {
    dateField: input.dateField,
    groupBy: input.groupBy,
    project: input.project,
    total: memories.length,
    groups: [...grouped.entries()].map(([key, items]) => ({
      key,
      label: input.groupBy === "week" ? `Week of ${key}` : key,
      items,
    })),
    undated,
  }
}

function dateFor(memory: MemoryRecord, field: TimelineDateField): string | null {
  if (field === "published") return memory.source.published_at
  if (field === "first_seen") return memory.firstSeenAt
  return memory.lastSeenAt
}

function groupKey(value: string, groupBy: TimelineGroupBy): string | null {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  const year = date.getUTCFullYear()
  const month = pad(date.getUTCMonth() + 1)
  const day = pad(date.getUTCDate())
  if (groupBy === "day") return `${year}-${month}-${day}`
  if (groupBy === "month") return `${year}-${month}`

  const monday = new Date(Date.UTC(year, date.getUTCMonth(), date.getUTCDate()))
  const daysFromMonday = (monday.getUTCDay() + 6) % 7
  monday.setUTCDate(monday.getUTCDate() - daysFromMonday)
  return `${monday.getUTCFullYear()}-${pad(monday.getUTCMonth() + 1)}-${pad(monday.getUTCDate())}`
}

function normalizeBoundary(value: string, endOfDay: boolean): string {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) return value
  return `${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`
}

function pad(value: number): string {
  return String(value).padStart(2, "0")
}
