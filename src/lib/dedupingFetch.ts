const inProgressFetches = new Map<string, Promise<string[][]>>()

export default function dedupingFetch(url: URL): Promise<string[][]> {
  const key = url.toString()

  const pending = inProgressFetches.get(key)
  if (pending) return pending

  const promise = fetch(url)
    .then((r) => r.json() as Promise<string[][]>)
    .finally(() => {
      inProgressFetches.delete(key)
    })
  inProgressFetches.set(key, promise)
  return promise
}
