import type { MemoryRecord, Project, Relevance } from "../model.js"

export function calculateRelevance(
  memory: MemoryRecord,
  projects: readonly Project[],
): readonly Relevance[] {
  const haystack =
    `${memory.content.title} ${memory.content.text} ${memory.classification.topics.join(" ")}`.toLowerCase()
  return projects
    .map((project) => {
      const reasons = project.technologies
        .map((technology) => technology.toLowerCase())
        .filter((technology) => haystack.includes(technology))
        .map((technology) => `topic:${technology}`)
      const goalMatches = project.goals.filter((goal) =>
        goal
          .toLowerCase()
          .split(/\W+/)
          .some((term) => term.length > 4 && haystack.includes(term)),
      )
      const score = Math.min(0.25 + reasons.length * 0.25 + goalMatches.length * 0.1, 1)
      return { projectSlug: project.slug, projectName: project.name, score, reasons }
    })
    .filter((item) => item.reasons.length > 0)
    .sort((left, right) => right.score - left.score)
}
