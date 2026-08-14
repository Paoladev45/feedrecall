import type { ObsolescenceStatus } from "../types.js"

const labels: Readonly<Record<ObsolescenceStatus, string>> = {
  fresh: "Fresh",
  watch: "Watch",
  likely_expired: "Likely expired",
  likely_replaced: "Likely replaced",
}

export function ObsolescenceBadge({ status }: { readonly status: ObsolescenceStatus }) {
  return (
    <span className={`obsolescence-status obsolescence-status--${status}`}>{labels[status]}</span>
  )
}
