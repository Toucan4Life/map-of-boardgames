import type { Repositories } from './FocusViewModel'

/** View model backing the "largest games in this region" side panel. */
export default class GroupViewModel {
  largest: Repositories[] = []

  setLargest(currentLargest: Repositories[]): void {
    this.largest = currentLargest
  }
}
