import {
  Archive,
  Boxes,
  CalendarDays,
  Database,
  FolderKanban,
  Inbox,
  Lightbulb,
  Search,
  Settings2,
  SlidersHorizontal,
  X,
} from "lucide-react"
import { useMemo, useRef } from "react"
import { DiscoveryRow } from "./components/DiscoveryRow.js"
import { EvidenceBadge } from "./components/EvidenceBadge.js"
import { MemoryDetail } from "./components/MemoryDetail.js"
import { useMemoryFeed } from "./use-memory-feed.js"

export function App() {
  const {
    memories,
    stats,
    query,
    setQuery,
    evidence,
    setEvidence,
    selectedId,
    setSelectedId,
    error,
  } = useMemoryFeed()
  const detailPaneRef = useRef<HTMLElement>(null)

  const selected = useMemo(
    () => memories.find((memory) => memory.id === selectedId) ?? memories[0] ?? null,
    [memories, selectedId],
  )
  const opportunities = memories
    .filter(
      (memory) =>
        (memory.relevance[0]?.score ?? 0) >= 0.7 && memory.decision.status === "undecided",
    )
    .slice(0, 4)

  const inspectMemory = (id: string) => {
    setSelectedId(id)
    if (!window.matchMedia("(max-width: 900px)").matches) return
    window.requestAnimationFrame(() => {
      const detailPane = detailPaneRef.current
      if (!detailPane) return
      detailPane.focus({ preventScroll: true })
      detailPane.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
        block: "start",
      })
    })
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">
            <Boxes size={18} />
          </span>
          <strong>FeedRecall</strong>
        </div>
        <nav aria-label="Primary navigation">
          <a className="nav-item nav-item--active" href="#today">
            <Inbox size={17} />
            Inbox <b>{stats.needsReview}</b>
          </a>
          <a className="nav-item" href="#projects">
            <FolderKanban size={17} />
            Projects <b>{stats.projects}</b>
          </a>
          <a className="nav-item" href="#timeline">
            <CalendarDays size={17} />
            Timeline
          </a>
          <a className="nav-item" href="#opportunities">
            <Lightbulb size={17} />
            Opportunities
          </a>
          <a className="nav-item" href="#sources">
            <Database size={17} />
            Sources
          </a>
          <a className="nav-item" href="#archive">
            <Archive size={17} />
            Archive
          </a>
        </nav>
        <div className="sidebar-footer">
          <span>
            <i /> Local only
          </span>
          <span title="Settings are planned for v0.2">
            <Settings2 size={17} />
          </span>
        </div>
      </aside>
      <main className="main-pane">
        <header className="topbar">
          <div>
            <span>Memory cockpit</span>
            <h1>Today</h1>
          </div>
          <label className="search-field">
            <Search size={16} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search memories, projects, sources..."
            />
            <button
              className="search-clear"
              type="button"
              aria-label="Clear search"
              title="Clear search"
              disabled={!query}
              onClick={() => setQuery("")}
            >
              <X size={14} />
            </button>
          </label>
          <a
            className="icon-button"
            href="#evidence-filter"
            title="Evidence filters"
            aria-label="Evidence filters"
          >
            <SlidersHorizontal size={17} />
          </a>
        </header>
        <section className="metric-strip" aria-label="Vault summary">
          <div>
            <span>Memories</span>
            <strong>{stats.memories}</strong>
            <small>local vault</small>
          </div>
          <div>
            <span>Needs review</span>
            <strong>{stats.needsReview}</strong>
            <small>in inbox</small>
          </div>
          <div>
            <span>Projects</span>
            <strong>{stats.projects}</strong>
            <small>active context</small>
          </div>
          <div>
            <span>Tested</span>
            <strong>{stats.tested}</strong>
            <small>local evidence</small>
          </div>
        </section>
        <section className="workspace" id="today">
          <div className="list-pane">
            <div className="section-toolbar">
              <div>
                <h2>{memories.length} discoveries</h2>
                <span>Newest first</span>
              </div>
              <select
                id="evidence-filter"
                value={evidence}
                onChange={(event) => setEvidence(event.target.value)}
                aria-label="Evidence status"
              >
                <option value="">All evidence</option>
                <option value="claimed">Claimed</option>
                <option value="verified">Verified</option>
                <option value="tested">Tested</option>
              </select>
            </div>
            <div className="list-header">
              <span>Discovery</span>
              <span>Relevance</span>
              <span>Evidence</span>
              <span>Date</span>
            </div>
            {error ? (
              <div className="state-message state-message--error">{error}</div>
            ) : memories.length === 0 ? (
              <div className="state-message">No discoveries match this view.</div>
            ) : (
              memories.map((memory) => (
                <DiscoveryRow
                  key={memory.id}
                  memory={memory}
                  selected={memory.id === selected?.id}
                  onSelect={(next) => setSelectedId(next.id)}
                />
              ))
            )}
          </div>
          <aside
            className="detail-pane"
            aria-label="Discovery detail"
            ref={detailPaneRef}
            tabIndex={-1}
          >
            {selected ? (
              <MemoryDetail memory={selected} />
            ) : (
              <div className="state-message">Select a discovery.</div>
            )}
          </aside>
        </section>
        <section className="opportunities" id="opportunities">
          <div className="band-heading">
            <div>
              <Lightbulb size={18} />
              <h2>Opportunities</h2>
            </div>
            <span>{opportunities.length} detected</span>
          </div>
          {opportunities.length === 0 ? (
            <div className="state-message">
              Project matches will appear here after relevance is calculated.
            </div>
          ) : (
            opportunities.map((memory) => (
              <div className="opportunity-row" key={memory.id}>
                <strong>{memory.relevance[0]?.projectName}</strong>
                <span className="opportunity-discovery">{memory.content.title}</span>
                <span className="opportunity-next">Review for project fit</span>
                <EvidenceBadge status={memory.evidence.status} />
                <b>{Math.round((memory.relevance[0]?.score ?? 0) * 100)}%</b>
                <button type="button" onClick={() => inspectMemory(memory.id)}>
                  Inspect
                </button>
              </div>
            ))
          )}
        </section>
        <section className="archive-summary" id="archive">
          <Archive size={17} />
          <strong>Archive</strong>
          <span>
            {memories.filter((memory) => memory.processing.status === "archived").length} in current
            view
          </span>
        </section>
      </main>
    </div>
  )
}
