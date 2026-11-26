export const E2_SAVE_BROADCAST_CHANNEL = 'fsidx-e2-saved'

export type E2SavedBroadcast = {
  path: string
  savedAt: number
}

export function postE2Saved(path: string): void {
  if (typeof BroadcastChannel === 'undefined') return
  const ch = new BroadcastChannel(E2_SAVE_BROADCAST_CHANNEL)
  ch.postMessage({ path, savedAt: Date.now() } satisfies E2SavedBroadcast)
  ch.close()
}

export function subscribeE2Saved(onSaved: (msg: E2SavedBroadcast) => void): () => void {
  if (typeof BroadcastChannel === 'undefined') return () => {}
  const ch = new BroadcastChannel(E2_SAVE_BROADCAST_CHANNEL)
  const handler = (evt: MessageEvent) => {
    const data = evt.data as Partial<E2SavedBroadcast>
    if (typeof data?.path !== 'string') return
    onSaved({ path: data.path, savedAt: data.savedAt ?? Date.now() })
  }
  ch.addEventListener('message', handler)
  return () => {
    ch.removeEventListener('message', handler)
    ch.close()
  }
}