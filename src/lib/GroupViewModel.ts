import { ref, nextTick, type Ref } from 'vue'
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
  loading: Ref<boolean>
  error: Ref<string>
  chat: Ref<chatMessage[]>
  largest: Ref<Repositories[]>
  constructor() {
    this.largest = ref([])
    this.chat = ref([])
    this.error = ref('')
    this.loading = ref(false)
    this.pendingRequest = undefined
  }

  setLargest(currentLargest: Repositories[]): void {
    this.largest.value = currentLargest
    if (this.chat.value.length === 0) {
      this.chat.value.push(
        {
          id: '0',
          isEdited: false,
          role: 'system',
          content:
            'A user is looking at the following github repositories:' +
            currentLargest
              .slice(0, 20)
              .map((repo) => '\n- ' + repo.name)
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
    this.chat.value.push({
      id: generateShortRandomId(),
      content: '',
      role: 'user',
      isEdited: true,
    })
  }

  submit(model: string): void {
    this.error.value = ''
    if (this.pendingRequest) this.pendingRequest.isCancelled = true
    const request: { model: string; messages: { content: string; role: string }[] } = {
      model: model,
      messages: this.chat.value.map((message) => {
        return {
          content: message.content,
          role: message.role,
        }
      }),
    }
    this.chat.value.forEach((message: chatMessage) => {
      message.isEdited = false
    })
    this.loading.value = true
    const p = {
      promise: sendChatRequest([request])
        .then((responseMessage) => {
          if (this.pendingRequest?.isCancelled) return
          this.loading.value = false
          const newMessageId = generateShortRandomId()
          responseMessage.id = newMessageId
          this.chat.value.push(responseMessage)
          nextTick(() => {
            const newMessageEl = document.querySelector(`.add-message-link`)
            if (newMessageEl) newMessageEl.scrollIntoView()
          })
        })
        .catch((err) => {
          console.error(err)
          this.error.value = 'Something went wrong. Open dev console for more details'
        })
        .finally(() => {
          this.loading.value = false
        }),
      isCancelled: false,
    }
    this.pendingRequest = p
  }

  deleteMessage(id: string | number): void {
    this.chat.value = this.chat.value.filter((message) => message.id !== id)
  }

  cancelQuery(): void {
    this.loading.value = false
    if (this.pendingRequest) this.pendingRequest.isCancelled = true
  }
}
