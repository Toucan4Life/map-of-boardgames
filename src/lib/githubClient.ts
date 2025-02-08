import bus from './bus.ts'
import { getMarkdownContent } from './getMarkdownContent.ts'

const readmeFilesFormat = [
  'README.md', // (Markdown)
  'README.markdown', // (Markdown)
  'README.rst', // (reStructuredText)
  'README.txt', // (Plain Text)
  'README', // (Plain Text)
  'README.mkd', // (Markdown)
  'readme.md', // (Markdown)
]
const headerDict: Record<string, string> = {
  Accept: 'application/json',
}

const rawGithubUrl = 'https://raw.githubusercontent.com/'
let currentUser: undefined | User
const cachedRepositories = new Map<string, Repository>()
interface Repository {
  state: string
  name: string
  description: string
  language: string
  stars: string
  forks: string
  watchers: string
  default_branch: string
  topics: string
  license: string
  updated_at: string
  remainingRequests: string | null
}

export interface User {
  avatar_url: string
}

if (document.cookie.includes('github_token')) {
  headerDict['Authorization'] = 'Bearer ' + document.cookie.split('github_token=')[1].split(';')[0]
}

export function setAuthToken(token: string) {
  headerDict['Authorization'] = 'Bearer ' + token
  // also write to cookie:
  document.cookie = 'github_token=' + token
  bus.fire('auth-changed')
}

export function signOut() {
  delete headerDict['Authorization']
  document.cookie = 'github_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
  currentUser = undefined
  bus.fire('auth-changed')
}

export async function getCurrentUser(): Promise<User | undefined> {
  if (currentUser) return currentUser
  if (!headerDict['Authorization']) return
  const requestOptions = { headers: new Headers(headerDict) }
  const response = await fetch('https://api.github.com/user', requestOptions)
  if (response.ok) {
    currentUser = (await response.json()) as User
    return currentUser
  }
}

export function getCachedCurrentUser(): User | undefined {
  return currentUser
}

export async function getRepoInfo(repoName: string) {
  if (cachedRepositories.has(repoName)) {
    return cachedRepositories.get(repoName)
  }
  const requestOptions = { headers: new Headers(headerDict) }
  const response = await fetch(`https://api.github.com/repos/${repoName}`, requestOptions)
  if (!response.ok) {
    if (response.headers.get('x-ratelimit-remaining') === '0') {
      const rateLimit = response.headers.get('x-ratelimit-reset')
      if (!rateLimit) {
        return {
          state: 'RATE_LIMIT_EXCEEDED',
          name: repoName,
        }
      }
      const retryIn = new Date(+rateLimit * 1000)
      return {
        state: 'RATE_LIMIT_EXCEEDED',
        name: repoName,
        retryIn: retryIn.toLocaleDateString() + ' ' + retryIn.toLocaleTimeString(),
      }
    } else if (response.status === 404) {
      return {
        state: 'NOT_FOUND',
        name: repoName,
      }
    } else if (response.status === 451) {
      return {
        state: 'ERROR',
        error: 'Repository is unavailable due to legal reasons (http status code 451).',
      }
    } else {
      const errorMessage = ['HTTP error']
      try {
        const data = await response.json()
        if (data?.message) errorMessage.push('Message: ' + data.message)
      } catch (e: unknown) {
        /* ignore */
        console.error(e)
      }
      errorMessage.push('Status: ' + response.status)

      return {
        state: 'ERROR',
        error: errorMessage.join('. '),
      }
    }
  }
  const data = await response.json()
  const remainingRequests = response.headers.get('x-ratelimit-remaining')
  const repository: Repository = {
    state: 'LOADED',
    name: data.name,
    description: data.description,
    language: data.language,
    stars: formatNiceNumber(data.stargazers_count),
    forks: formatNiceNumber(data.forks_count),
    watchers: data.watchers_count,
    default_branch: data.default_branch,
    topics: data.topics,
    license: data.license?.spdx_id || data.license?.key,
    updated_at: new Date(data.updated_at).toLocaleDateString(),
    remainingRequests,
  }
  cachedRepositories.set(repoName, repository)
  return repository
}

export async function getReadme(repoName: string, default_branch: Array<string>) {
  if (!default_branch) {
    default_branch = ['master', 'main']
  }

  for (const branch of default_branch) {
    for (const readmeFile of readmeFilesFormat) {
      const response = await fetch(`${rawGithubUrl}${repoName}/${branch}/${readmeFile}`)
      if (response.ok) {
        const markdownString = await response.text()
        const safeMarkdownString = await getMarkdownContent(markdownString, repoName, branch)
        return {
          state: 'LOADED',
          content: safeMarkdownString,
        }
      }
    }
  }
}

function formatNiceNumber(x: number) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}
