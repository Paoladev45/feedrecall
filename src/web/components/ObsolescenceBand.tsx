import { ArchiveX, ScanSearch } from "lucide-react"
import type { ObsolescenceAssessment, ObsolescenceResult } from "../types.js"
import { ObsolescenceBadge } from "./ObsolescenceBadge.js"

type Props = {
  readonly result: ObsolescenceResult
  readonly onInspect: (id: string) => void
}

export function ObsolescenceBand({ result, onInspect }: Props) {
  const assessments = result.assessments
    .filter((assessment) => assessment.status !== "fresh")
    .slice(0, 6)
  return (
    <section className="analysis-band obsolescence-band" id="review" aria-labelledby="review-title">
      <div className="analysis-heading">
        <div className="analysis-title">
          <ArchiveX size={18} />
          <div>
            <span>Knowledge maintenance</span>
            <h2 id="review-title">Review signals</h2>
          </div>
        </div>
        <div className="obsolescence-counts">
          <span className="obsolescence-count obsolescence-count--expired">
            {result.counts.likely_expired} expired
          </span>
          <span className="obsolescence-count obsolescence-count--replaced">
            {result.counts.likely_replaced} replaced
          </span>
          <span className="obsolescence-count obsolescence-count--watch">
            {result.counts.watch} watch
          </span>
        </div>
      </div>
      {assessments.length === 0 ? (
        <div className="state-message">No review signals in this vault.</div>
      ) : (
        <div className="obsolescence-list">
          {assessments.map((assessment) => (
            <ObsolescenceRow
              key={assessment.memoryId}
              assessment={assessment}
              onInspect={onInspect}
            />
          ))}
        </div>
      )}
      <div className="analysis-footnote">
        Suggestions are local review signals. No external likes, bookmarks, or posts are changed.
      </div>
    </section>
  )
}

function ObsolescenceRow({
  assessment,
  onInspect,
}: {
  readonly assessment: ObsolescenceAssessment
  readonly onInspect: (id: string) => void
}) {
  const action = assessment.recommendation === "archive_candidate" ? "Review candidate" : "Inspect"
  return (
    <div className="obsolescence-row">
      <ObsolescenceBadge status={assessment.status} />
      <div className="obsolescence-copy">
        <strong>{assessment.title}</strong>
        <span>
          {assessment.ageDays} days old / {assessment.freshnessWindowDays}-day window /{" "}
          {assessment.confidence * 100}% confidence
        </span>
      </div>
      <p>{assessment.reasons[assessment.reasons.length - 1]}</p>
      <div className="obsolescence-related">
        {assessment.relatedTitle ? (
          <span>Compared with: {assessment.relatedTitle}</span>
        ) : (
          <span>No newer match</span>
        )}
      </div>
      <button className="text-action" type="button" onClick={() => onInspect(assessment.memoryId)}>
        <ScanSearch size={14} aria-hidden="true" />
        {action}
      </button>
    </div>
  )
}
