import { CalendarDays, ChevronDown, ChevronRight, ExternalLink } from "lucide-react"
import { useState } from "react"
import type { Timeline, TimelineDateField, TimelineGroupBy } from "../types.js"
import { EvidenceBadge } from "./EvidenceBadge.js"

type Props = {
  readonly timeline: Timeline
  readonly dateField: TimelineDateField
  readonly groupBy: TimelineGroupBy
  readonly onDateFieldChange: (value: TimelineDateField) => void
  readonly onGroupByChange: (value: TimelineGroupBy) => void
  readonly onInspect: (id: string) => void
}

export function TimelineBand({
  timeline,
  dateField,
  groupBy,
  onDateFieldChange,
  onGroupByChange,
  onInspect,
}: Props) {
  const [showAllGroups, setShowAllGroups] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<ReadonlySet<string>>(new Set())
  const groups = showAllGroups ? timeline.groups : timeline.groups.slice(0, 8)

  const toggleGroup = (key: string): void => {
    setExpandedGroups((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  return (
    <section
      className="analysis-band timeline-band"
      id="timeline-view"
      aria-labelledby="timeline-title"
    >
      <div className="analysis-heading">
        <div className="analysis-title">
          <CalendarDays size={18} />
          <div>
            <span>Chronology</span>
            <h2 id="timeline-title">Your discovery trail</h2>
          </div>
        </div>
        <div className="analysis-controls">
          <label>
            <span>Date basis</span>
            <select
              value={dateField}
              onChange={(event) => onDateFieldChange(parseDateField(event.target.value))}
            >
              <option value="published">Published</option>
              <option value="first_seen">First seen</option>
              <option value="last_seen">Last seen</option>
            </select>
          </label>
          <label>
            <span>Group by</span>
            <select
              value={groupBy}
              onChange={(event) => onGroupByChange(parseGroupBy(event.target.value))}
            >
              <option value="day">Day</option>
              <option value="week">Week</option>
              <option value="month">Month</option>
            </select>
          </label>
          {timeline.groups.length > 8 ? (
            <button
              className="timeline-more-button"
              type="button"
              aria-expanded={showAllGroups}
              onClick={() => setShowAllGroups((visible) => !visible)}
            >
              <ChevronDown size={14} aria-hidden="true" />
              {showAllGroups ? "Show recent periods" : `Show all ${timeline.groups.length} periods`}
            </button>
          ) : null}
        </div>
      </div>
      {groups.length === 0 ? (
        <div className="state-message">No dated discoveries yet.</div>
      ) : (
        <div className="timeline-groups">
          {groups.map((group) => (
            <div className="timeline-group" key={group.key}>
              <div className="timeline-group-heading">
                <strong>{group.label}</strong>
                <span>{group.items.length}</span>
              </div>
              <div className="timeline-items">
                {(expandedGroups.has(group.key) ? group.items : group.items.slice(0, 3)).map(
                  (item) => (
                    <div className="timeline-item-row" key={item.memory.id}>
                      <button
                        className="timeline-item"
                        type="button"
                        onClick={() => onInspect(item.memory.id)}
                        title={item.memory.content.title}
                      >
                        <span className="timeline-item-copy">
                          <strong>{item.memory.content.title}</strong>
                          <time dateTime={item.date}>{formatTimelineDate(item.date)}</time>
                        </span>
                        <EvidenceBadge status={item.memory.evidence.status} />
                        <ChevronRight size={14} aria-hidden="true" />
                      </button>
                      <a
                        className="timeline-source-link"
                        href={item.memory.source.url}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`Open source: ${item.memory.content.title}`}
                        title="Open source"
                      >
                        <ExternalLink size={14} aria-hidden="true" />
                      </a>
                    </div>
                  ),
                )}
              </div>
              {group.items.length > 3 ? (
                <button
                  className="timeline-more-button timeline-more-button--subtle"
                  type="button"
                  aria-expanded={expandedGroups.has(group.key)}
                  onClick={() => toggleGroup(group.key)}
                >
                  <ChevronDown size={13} aria-hidden="true" />
                  {expandedGroups.has(group.key)
                    ? "Show fewer discoveries"
                    : `Show ${group.items.length - 3} more discoveries`}
                </button>
              ) : null}
            </div>
          ))}
        </div>
      )}
      {timeline.total > 0 ? (
        <div className="timeline-summary">
          Showing {groups.length} of {timeline.groups.length} periods and {timeline.total}{" "}
          discoveries
        </div>
      ) : null}
      {timeline.undated.length > 0 ? (
        <div className="timeline-undated">{timeline.undated.length} without a publication date</div>
      ) : null}
    </section>
  )
}

function formatTimelineDate(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
}

function parseDateField(value: string): TimelineDateField {
  if (value === "first_seen" || value === "last_seen") return value
  return "published"
}

function parseGroupBy(value: string): TimelineGroupBy {
  if (value === "day" || value === "week") return value
  return "month"
}
