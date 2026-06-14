/** Shortens a space-separated NIM address to its first and last group, e.g. "NQ07 **** **** 6789". */
export function shortenAddress(address: string): string {
  const groups = address.trim().split(/\s+/)
  if (groups.length < 3) return address
  return `${groups[0]} **** **** ${groups[groups.length - 1]}`
}
