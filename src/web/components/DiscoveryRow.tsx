import { ExternalLink } from "lucide-react"
import type { Memory } from "../types.js"
import { EvidenceBadge } from "./EvidenceBadge.js"

type Props = {
  readonly memory: Memory
  readonly selected: boolean
  readonly onSelect: (memory: Memory) => void
}

export function DiscoveryRow({ memory, selected, onSelect }: Props) {
  const relevance = memory.relevance[0]
  const date = new Date(memory.source.published_at ?? memory.firstSeenAt)
  return (
    <button
      className={`discovery-row${selected ? " discovery-row--selected" : ""}`}
      type="button"
      onClick={() => onSelect(memory)}
    >
      <span className="source-mark" title={memory.source.platform}>
        {memory.source.platform.slice(0, 2).toUpperCase()}
      </span>
      <span className="discovery-copy">
        <strong>{memory.content.title}</strong>
        <span>{memory.content.text || memory.source.author}</span>
      </span>
      <span className="relevance-cell">
        <b>{relevance ? Math.round(relevance.score * 100) : 0}</b>
        <span className="relevance-track">
          <i style={{ inlineSize: `${Math.round((relevance?.score ?? 0) * 100)}%` }} />
        </span>
      </span>
      <EvidenceBadge status={memory.evidence.status} />
      <time dateTime={date.toISOString()}>
        {date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
      </time>
      <ExternalLink aria-hidden="true" size={14} />
    </button>
  )
}
