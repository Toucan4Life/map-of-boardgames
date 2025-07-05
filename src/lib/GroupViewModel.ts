import { nextTick } from 'vue'
import generateShortRandomId from './generateShortRandomId'
import { sendChatRequest } from './openAIClient'
import type { Repositories } from './FocusViewModel'

export interface chatMessage {
  id: string
  isEdited: boolean
  role: string
  content: string
}
export default class GroupViewModel {
  pendingRequest: { promise: Promise<void>; isCancelled: boolean } | undefined
  loading: boolean
  error: string
  chat: chatMessage[]
  largest: Repositories[]
  constructor() {
    this.largest = []
    this.chat = []
    this.error = ''
    this.loading = false
    this.pendingRequest = undefined
  }

  setLargest(currentLargest: Repositories[]): void {
    this.largest = currentLargest
    if (this.chat.length === 0) {
      this.chat.push(
        {
          id: '0',
          isEdited: false,
          role: 'system',
          content:
            'A user is looking at the following github repositories:' +
            currentLargest
              .slice(0, 20)
              .map((repo) => {
                if (repo.name === undefined) return ''
                return '\n- ' + repo.name.toString()
              })
              .join(''),
        },
        {
          role: 'user',
          id: '1',
          isEdited: false,
          content: '', // Please analyze these repository and detect a common theme (e.g. programming language, technology, domain). Pay attention to language too (english, chinese, korean, etc.). If there is no common theme found, please say so. Otherwise, If you can find a strong signal for a common theme please come up with a specific name for imaginary country that contains all these repositories. Give a few options. When you give an option prefer more specific over generic option (for example if repositories are about recommender systems, use that, instead of generic DeepLearning)'
        },
      )
    }
  }

  addMessage(): void {
    this.chat.push({
      id: generateShortRandomId(),
      content: '',
      role: 'user',
      isEdited: true,
    })
  }

  submit(model: string): void {
    this.error = ''
    if (this.pendingRequest) this.pendingRequest.isCancelled = true
    const request: { model: string; messages: { content: string; role: string }[] } = {
      model: model,
      messages: this.chat.map((message) => {
        return {
          content: message.content,
          role: message.role,
        }
      }),
    }
    this.chat.forEach((message: chatMessage) => {
      message.isEdited = false
    })
    this.loading = true
    const p = {
      promise: sendChatRequest([request])
        .then((responseMessage) => {
          if (this.pendingRequest?.isCancelled) return
          this.loading = false
          const newMessageId = generateShortRandomId()
          responseMessage.id = newMessageId
          this.chat.push(responseMessage)
          nextTick(() => {
            const newMessageEl = document.querySelector(`.add-message-link`)
            if (newMessageEl) newMessageEl.scrollIntoView()
          }).catch((err: unknown) => {
            console.error(err)
            this.error = 'Something went wrong. Open dev console for more details'
          })
        })
        .catch((err: unknown) => {
          console.error(err)
          this.error = 'Something went wrong. Open dev console for more details'
        })
        .finally(() => {
          this.loading = false
        }),
      isCancelled: false,
    }
    this.pendingRequest = p
  }

  deleteMessage(id: string | number): void {
    this.chat = this.chat.filter((message) => message.id !== id)
  }

  cancelQuery(): void {
    this.loading = false
    if (this.pendingRequest) this.pendingRequest.isCancelled = true
  }
}
