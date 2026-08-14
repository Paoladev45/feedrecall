import { z } from "zod"

export const GrowthMetricInputSchema = z.strictObject({
  visits: z.number().int().nonnegative(),
  stars: z.number().int().nonnegative(),
  externalUsers: z.number().int().nonnegative(),
  externalIssues: z.number().int().nonnegative(),
  contributors: z.number().int().nonnegative(),
  downloads: z.number().int().nonnegative(),
})

export type GrowthMetricInput = z.infer<typeof GrowthMetricInputSchema>
export type GrowthOutcome = "adoption" | "interest" | "iterate"

export type GrowthMeasurement = {
  readonly outcome: GrowthOutcome
  readonly visitToStarRate: number | null
  readonly visitToUserRate: number | null
}

function rate(value: number, visits: number): number | null {
  return visits === 0 ? null : Number((value / visits).toFixed(4))
}

export function measureCampaign(input: GrowthMetricInput): GrowthMeasurement {
  const hasAdoptionSignal =
    input.externalUsers > 0 || input.externalIssues > 0 || input.contributors > 0
  const hasInterestSignal = input.stars > 0 || input.downloads > 0

  return {
    outcome: hasAdoptionSignal ? "adoption" : hasInterestSignal ? "interest" : "iterate",
    visitToStarRate: rate(input.stars, input.visits),
    visitToUserRate: rate(input.externalUsers, input.visits),
  }
}
