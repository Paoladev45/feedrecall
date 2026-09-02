import { ExternalLink } from "lucide-react"
import type { Memory } from "../types.js"
import { EvidenceBadge } from "./EvidenceBadge.js"

function safeHttpUrl(value: string): string | null {
  const trimmed = value.trim()
  return /^https?:\/\//i.test(trimmed) ? trimmed : null
}

function isVideoUrl(value: string): boolean {
  return /\.(?:mp4|webm|mov|m4v)(?:[?#]|$)/i.test(value)
}

function isImageUrl(value: string): boolean {
  return /\.(?:avif|gif|jpe?g|png|webp)(?:[?#]|$)/i.test(value) || /pbs\.twimg\.com/i.test(value)
}

export function MemoryDetail({ memory }: { readonly memory: Memory }) {
  const sourceUrl = safeHttpUrl(memory.source.url)
  const linkedResources = [...new Set(memory.content.external_links)]
  const mediaItems = [...new Set(memory.content.media)]
  return (
    <div className="detail-content">
      <div className="detail-heading" id="source-detail">
        <span>
          {memory.source.platform} / {memory.source.type}
        </span>
        <h2>{memory.content.title}</h2>
        {sourceUrl ? (
          <a href={sourceUrl} target="_blank" rel="noreferrer">
            Open source
          </a>
        ) : (
          <span>Source URL unavailable</span>
        )}
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
      <div className="detail-section" id="evidence">
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
      {linkedResources.length > 0 ? (
        <div className="detail-section">
          <div className="detail-section-heading">
            <h3>Linked resources</h3>
            <span className="detail-count">{linkedResources.length}</span>
          </div>
          <ul className="resource-list">
            {linkedResources.map((link) => {
              const href = safeHttpUrl(link)
              return (
                <li key={link}>
                  {href ? (
                    <a href={href} target="_blank" rel="noreferrer">
                      <span className="resource-url">{link}</span>
                      <ExternalLink size={14} aria-hidden="true" />
                    </a>
                  ) : (
                    <span className="resource-fallback">{link}</span>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}
      {mediaItems.length > 0 ? (
        <div className="detail-section">
          <div className="detail-section-heading">
            <h3>Media</h3>
            <span className="detail-count">{mediaItems.length}</span>
          </div>
          <div className="media-grid">
            {mediaItems.map((mediaUrl, index) => {
              const href = safeHttpUrl(mediaUrl)
              const label = `Saved post media ${index + 1}`
              return (
                <figure className="media-frame" key={mediaUrl}>
                  {href && isVideoUrl(href) ? (
                    <a href={href} target="_blank" rel="noreferrer" aria-label={label}>
                      <ExternalLink size={18} aria-hidden="true" />
                      <span>Open video</span>
                    </a>
                  ) : href && isImageUrl(href) ? (
                    <img src={href} alt={label} loading="lazy" />
                  ) : href ? (
                    <a href={href} target="_blank" rel="noreferrer">
                      <ExternalLink size={18} aria-hidden="true" />
                      Open media
                    </a>
                  ) : (
                    <figcaption className="resource-fallback">{mediaUrl}</figcaption>
                  )}
                </figure>
              )
            })}
          </div>
        </div>
      ) : null}
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
