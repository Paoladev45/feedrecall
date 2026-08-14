# FeedRecall Design System

## 0. Research Log

- Embedded references: shortlisted Linear, Notion, and GitHub; selected operational taste + Linear density for compact navigation, restrained hierarchy, and precise status language.
- Product screens: Lazyweb search was attempted but its HTTP endpoint failed locally; no external screenshots were copied or shipped.
- Concept drafts: one board containing bright editorial, dark command-center, and split-pane directions was generated locally. Bright editorial won, with split-pane inspection behavior borrowed from the third direction.
- Product signature: a thin green relevance rail visually connects each discovery to the projects it can improve.

## 1. Atmosphere & Identity

FeedRecall is a calm technical observatory: dense enough for daily review, light enough for long reading sessions, and explicit about what is claimed versus tested. Its signature is the project-relevance rail, where green, blue, amber, and coral communicate meaning rather than decoration.

## 2. Color

| Role | Token | Value | Usage |
| --- | --- | --- | --- |
| Canvas | `--canvas` | `#f4f5f2` | App background |
| Surface | `--surface` | `#ffffff` | Main panes |
| Surface subtle | `--surface-subtle` | `#f8f9f7` | Toolbars and selected rows |
| Ink | `--ink` | `#151816` | Primary text |
| Muted | `--muted` | `#69716b` | Secondary text |
| Faint | `--faint` | `#929a94` | Quiet metadata |
| Border | `--border` | `#dfe3df` | Structural separators |
| Green | `--green` | `#16854b` | Verified, relevance, active |
| Green pale | `--green-pale` | `#e8f5ed` | Verified backgrounds |
| Blue | `--blue` | `#2563c7` | Tested and links |
| Blue pale | `--blue-pale` | `#eaf1ff` | Tested backgrounds |
| Amber | `--amber` | `#a96508` | Claimed and pending review |
| Amber pale | `--amber-pale` | `#fff3dc` | Claimed backgrounds |
| Coral | `--coral` | `#c44735` | High-impact opportunities |
| Coral pale | `--coral-pale` | `#fff0ed` | Expired review signals |
| Focus | `--focus` | `#1367d1` | Keyboard focus ring |

No purple palette, gradients, decorative blobs, or color without semantic meaning.

## 3. Typography

- Primary: `Inter`, `Segoe UI`, system sans-serif.
- Mono: `ui-monospace`, `SFMono-Regular`, `Consolas`, monospace.
- Page title: 24px/1.2, 680.
- Section title: 15px/1.35, 650.
- Row title: 14px/1.35, 620.
- Body: 14px/1.55, 400.
- Meta: 12px/1.4, 500.
- Micro labels and dense table headers: 10-11px, 600.
- Letter spacing is always `0`.

## 4. Spacing & Layout

- Base unit: 4px. Tokens: 4, 8, 12, 16, 20, 24, 32, 40px.
- Desktop shell: 216px sidebar plus one bounded scroll body.
- Main dashboard: content width up to 1440px; discovery and opportunity bands are full-width, not nested cards.
- Detail view: intrinsic list-detail split, 420px list target and fluid detail pane.
- At 900px the sidebar becomes a top rail; at 560px lists reflow to one column.
- Only the main content pane owns vertical scroll; the body itself stays bounded to `100dvh`.

## 5. Components

### Navigation Item
- Structure: Lucide icon, label, optional count.
- States: default, hover, selected, focus-visible.
- Layout: cluster; never truncates the active section name.

### Discovery Row
- Structure: source mark, title/summary, project relevance, evidence badge, date.
- States: default, hover, selected, empty, long URL/title.
- Layout: responsive grid; becomes stack below 680px.

### Evidence Badge
- Variants: claimed, observed, verified, tested, adopted, rejected.
- Accessibility: color plus text; never color alone.

### Metric Strip
- Structure: label, count, short trend or status.
- Layout: switcher; unframed within the page band.

### Opportunity Row
- Structure: project, discovery, impact, proposed next step.
- States in v0.1: default, hover, inspect. Ignored and experiment-created arrive with v0.3.
- Actions use icons with tooltips where the symbol is not universal.

### Timeline Band
- Structure: period header, grouped date labels, compact discovery entries, date-basis and grouping controls.
- Variants: day, week, month; published, first seen, last seen; empty and undated.
- Spacing: 16px inner rows, 24px band edges, 4px separators.
- States: default, loading, empty, error, focus-visible controls.
- Accessibility: controls have labels; each item retains title, source date, evidence, and source link, with an inspect action that can load a memory outside the active list filter.
- Motion: no decorative motion; selected controls use the existing 120ms focus feedback.
- Layout: full-width page band below the list-detail workspace; it collapses to a single column below 900px.

### Obsolescence Review Row
- Structure: status rail, discovery title, age/window metadata, explanation, related replacement, review action.
- Variants: fresh, watch, likely expired, likely replaced; keep, review, archive candidate.
- Spacing: 12px row padding, 8px metadata gap, 24px band edges.
- States: default, empty, error, inspect.
- Accessibility: status is textual and color is supplementary; recommendations never execute external cleanup.
- Motion: none beyond focus and hover feedback on the inspect action.
- Layout: full-width review band; rows reflow to two lines on mobile.

### Search Field
- Structure: search icon, text input, clear button.
- States: empty, typing, results, no results, focus, disabled.

## 6. Motion & Interaction

- Micro: 120ms ease-out for press and focus feedback.
- Standard: 220ms ease-in-out for detail-pane changes.
- Only `transform` and `opacity` animate.
- Reduced motion disables pane transitions.
- Rows do not move on hover; only surface and semantic rail change.

## 7. Depth & Surface

Tonal shift plus 1px structural separators. Individual repeated discoveries are rows, not floating cards. Modals and menus may use `0 8px 24px rgb(21 24 22 / 12%)`. Radius is 6px maximum, 4px by default.

## 8. Accessibility Constraints & Accepted Debt

- WCAG 2.2 AA, body contrast at least 4.5:1, complete keyboard reachability, visible focus, reduced motion respected.
- Status always includes a textual label.
- Primary content must not scroll horizontally at 375px.
- Accepted debt: none for v0.1.
