let counter = 0

export function nextNodeId(): string {
  counter += 1
  return `n_${counter.toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

export function resetIdCounter(): void {
  counter = 0
}