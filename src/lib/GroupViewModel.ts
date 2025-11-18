import type { Repositories } from './FocusViewModel'

export interface chatMessage {
  id: string
  isEdited: boolean
  role: string
  content: string
}
export default class GroupViewModel {
  loading: boolean
  error: string
  chat: chatMessage[]
  largest: Repositories[]
  constructor() {
    this.largest = []
    this.chat = []
    this.error = ''
    this.loading = false
  }

  setLargest(currentLargest: Repositories[]): void {
    this.largest = currentLargest
  }
}
