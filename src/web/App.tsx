import {
  Archive,
  Boxes,
  CalendarDays,
  ClockAlert,
  Database,
  ExternalLink,
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
import { ObsolescenceBand } from "./components/ObsolescenceBand.js"
import { TimelineBand } from "./components/TimelineBand.js"
import { useMemoryFeed } from "./use-memory-feed.js"

export function App() {
  const {
    memories,
    projects,
    selectedMemory,
    stats,
    query,
    setQuery,
    evidence,
    setEvidence,
    selectedId,
    selectMemory,
    inspectMemory: loadMemory,
    timeline,
    obsolescence,
    dateField,
    setDateField,
    groupBy,
    setGroupBy,
    error,
  } = useMemoryFeed()
  const detailPaneRef = useRef<HTMLElement>(null)

  const selected = useMemo(
    () =>
      selectedMemory ?? memories.find((memory) => memory.id === selectedId) ?? memories[0] ?? null,
    [memories, selectedId, selectedMemory],
  )
  const opportunities = memories
    .filter(
      (memory) =>
        (memory.relevance[0]?.score ?? 0) >= 0.7 && memory.decision.status === "undecided",
    )
    .slice(0, 4)

  const inspectMemory = async (id: string) => {
    await loadMemory(id)
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
          <a className="nav-item nav-item--active" href="#today" aria-label="Inbox" title="Inbox">
            <Inbox size={17} />
            <span>Inbox</span> <b>{stats.needsReview}</b>
          </a>
          <a className="nav-item" href="#projects" aria-label="Projects" title="Projects">
            <FolderKanban size={17} />
            <span>Projects</span> <b>{stats.projects}</b>
          </a>
          <a className="nav-item" href="#timeline-view" aria-label="Timeline" title="Timeline">
            <CalendarDays size={17} />
            <span>Timeline</span>
          </a>
          <a className="nav-item" href="#review" aria-label="Review" title="Review">
            <ClockAlert size={17} />
            <span>Review</span>
          </a>
          <a
            className="nav-item"
            href="#opportunities"
            aria-label="Opportunities"
            title="Opportunities"
          >
            <Lightbulb size={17} />
            <span>Opportunities</span>
          </a>
          <a className="nav-item" href="#source-detail" aria-label="Sources" title="Sources">
            <Database size={17} />
            <span>Sources</span>
          </a>
          <a className="nav-item" href="#archive" aria-label="Archive" title="Archive">
            <Archive size={17} />
            <span>Archive</span>
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
                  onSelect={selectMemory}
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
        <section className="projects-band" id="projects" aria-labelledby="projects-title">
          <div className="band-heading">
            <div>
              <FolderKanban size={18} />
              <h2 id="projects-title">Projects</h2>
            </div>
            <span>{projects.length} active contexts</span>
          </div>
          {projects.length === 0 ? (
            <div className="state-message">No projects imported yet.</div>
          ) : (
            <div className="project-list">
              {projects.map((project) => (
                <article className="project-row" key={project.slug}>
                  <div className="project-identity">
                    <span className={`project-status project-status--${project.status}`}>
                      {projectStatusLabels[project.status]}
                    </span>
                    <strong>{project.name}</strong>
                    <p>{project.description}</p>
                  </div>
                  <div className="project-facts">
                    <span>
                      <b>Goal</b>
                      {project.goals[0] ?? "No goal recorded"}
                    </span>
                    <span>
                      <b>Stack</b>
                      {project.technologies.slice(0, 4).join(" / ") || "No technologies recorded"}
                    </span>
                  </div>
                  <div className="project-links">
                    {project.repositories.slice(0, 2).map((repository) => (
                      <a key={repository} href={repository} target="_blank" rel="noreferrer">
                        <ExternalLink size={13} aria-hidden="true" />
                        Repository
                      </a>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
        <TimelineBand
          timeline={timeline}
          dateField={dateField}
          groupBy={groupBy}
          onDateFieldChange={setDateField}
          onGroupByChange={setGroupBy}
          onInspect={inspectMemory}
        />
        <ObsolescenceBand result={obsolescence} onInspect={inspectMemory} />
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
                <button type="button" onClick={() => void inspectMemory(memory.id)}>
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

const projectStatusLabels = {
  idea: "Idea",
  active: "Active",
  paused: "Paused",
  completed: "Completed",
} as const
