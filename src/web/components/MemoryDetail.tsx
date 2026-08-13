import type { Memory } from "../types.js"
import { EvidenceBadge } from "./EvidenceBadge.js"

export function MemoryDetail({ memory }: { readonly memory: Memory }) {
  return (
    <div className="detail-content">
      <div className="detail-heading" id="sources">
        <span>
          {memory.source.platform} / {memory.source.type}
        </span>
        <h2>{memory.content.title}</h2>
        <a href={memory.source.url} target="_blank" rel="noreferrer">
          Open source
        </a>
      </div>
      <p>{memory.knowledge.summary ?? memory.content.text ?? "No extracted description yet."}</p>
      {memory.knowledge.possibleUses.length > 0 ? (
        <div className="detail-section">
          <h3>Possible uses</h3>
          <ul className="possible-uses">
            {memory.knowledge.possibleUses.map((use) => (
              <li key={use}>{use}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="detail-section" id="projects">
        <h3>Evidence</h3>
        <div className="evidence-line">
          <EvidenceBadge status={memory.evidence.status} />
          <span>{Math.round(memory.evidence.confidence * 100)}% confidence</span>
        </div>
        <small>External content remains untrusted until inspected or tested.</small>
      </div>
      <div className="detail-section" id="timeline">
        <h3>Project relevance</h3>
        {memory.relevance.length === 0 ? (
          <small>No project match calculated.</small>
        ) : (
          memory.relevance.map((item) => (
            <div className="project-score" key={item.projectSlug}>
              <span>
                <strong>{item.projectName}</strong>
                <small>{item.reasons.join(" / ")}</small>
              </span>
              <b>{Math.round(item.score * 100)}</b>
            </div>
          ))
        )}
      </div>
      <div className="detail-section">
        <h3>Topics</h3>
        <div className="topic-cluster">
          {memory.classification.topics.map((topic) => (
            <span key={topic}>{topic}</span>
          ))}
        </div>
      </div>
      <div className="detail-section">
        <h3>Timeline</h3>
        <dl>
          <div>
            <dt>Published</dt>
            <dd>
              {memory.source.published_at
                ? new Date(memory.source.published_at).toLocaleString()
                : "Unknown"}
            </dd>
          </div>
          <div>
            <dt>First seen</dt>
            <dd>{new Date(memory.firstSeenAt).toLocaleString()}</dd>
          </div>
          <div>
            <dt>Last seen</dt>
            <dd>{new Date(memory.lastSeenAt).toLocaleString()}</dd>
          </div>
        </dl>
      </div>
    </div>
  )
}
