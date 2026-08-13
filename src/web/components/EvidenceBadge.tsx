const labels: Readonly<Record<string, string>> = {
  claimed: "Claimed",
  observed: "Observed",
  verified: "Verified",
  tested: "Tested",
  adopted: "Adopted",
  rejected: "Rejected",
}

export function EvidenceBadge({ status }: { readonly status: string }) {
  return <span className={`evidence evidence--${status}`}>{labels[status] ?? status}</span>
}
