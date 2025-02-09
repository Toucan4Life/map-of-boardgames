const inProgressFetches = new Map<URL, Promise<string[][]>>()

export default function dedupingFetch(url: URL): Promise<string[][]> {
  const pro = inProgressFetches.get(url)
  if (pro) {
    return pro
  }
  const promise = fetch(url).then((r) => r.json())
  inProgressFetches.set(url, promise)
  return promise
}
