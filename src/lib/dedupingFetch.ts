const inProgressFetches = new Map<URL, any>();

export default function dedupingFetch(url: URL) {
  if (inProgressFetches.has(url)) {
    return inProgressFetches.get(url);
  }
  const promise = fetch(url).then(r => r.json());
  inProgressFetches.set(url, promise);
  return promise;
}