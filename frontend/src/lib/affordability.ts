export interface AffordabilityResult {
  affordable: boolean
  /** How many more NIM the user needs. 0 when affordable. */
  deficit: number
}

/** Compares a wallet's NIM balance against the NIM amount needed. Returns null if the balance is unknown. */
export function affordability(nimBalance: number | null, nimNeeded: number): AffordabilityResult | null {
  if (nimBalance === null) return null
  const affordable = nimBalance >= nimNeeded
  return { affordable, deficit: affordable ? 0 : nimNeeded - nimBalance }
}
