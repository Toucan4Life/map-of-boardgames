import type { chatMessage } from './GroupViewModel'

export function getStoredOpenAIKey(): string {
  return localStorage.getItem('openai-token') || ''
}

export function storeOpenAIKey(key: string): void {
  localStorage.setItem('openai-token', key)
}

export async function getOpenAIModels(): Promise<chatMessage[]> {
  const headers = getAuthHeaders()
  return fetch('https://api.openai.com/v1/models', { headers })
    .then((response) => response.json())
    .then((data) => {
      if (data.error) throw new Error(data.error.message)

      return data.data.filter((x: { id: string[] }) => x.id.includes('gpt'))
    })
}

export async function sendChatRequest(messagess: Array<{ model: string; messages: { content: string; role: string }[] }>): Promise<chatMessage> {
  const headers = getAuthHeaders()
  const body = JSON.stringify(messagess)

  const url = 'https://api.openai.com/v1/chat/completions'
  const response = await fetch(url, { method: 'POST', headers, body })
  const data = await response.json()

  if (data?.error?.message) throw new Error(data.error.message)

  // TODO: Handle errors
  return data.choices[0].message
}

function getStoredOpenAIKeyOrThrow(): string {
  const key = getStoredOpenAIKey()
  if (!key) throw new Error('No OpenAI API key provided')

  return key
}

function getAuthHeaders(): { Authorization: string; 'Content-Type': string } {
  return { Authorization: `Bearer ${getStoredOpenAIKeyOrThrow()}`, 'Content-Type': 'application/json' }
}
