import type { ComponentPublicInstance, DirectiveBinding, ObjectDirective } from 'vue'

type DocumentHandler = <T extends Event>(mouseup: T, mousedown: T) => void
type FlushList = Map<HTMLElement, { documentHandler: DocumentHandler }>
const nodeList: FlushList = new Map()

let startClick: MouseEvent | TouchEvent

function onMouseOrTouchStart(e: MouseEvent | TouchEvent) {
  startClick = e
}

function onMouseOrTouchEnd(e: MouseEvent | TouchEvent) {
  for (const { documentHandler } of nodeList.values()) documentHandler(e, startClick)
}

let listenersAttached = false

function attachListeners() {
  if (listenersAttached) return
  listenersAttached = true
  document.addEventListener('mousedown', onMouseOrTouchStart)
  document.addEventListener('mouseup', onMouseOrTouchEnd)
  document.addEventListener('touchstart', onMouseOrTouchStart)
  document.addEventListener('touchend', onMouseOrTouchEnd)
}

function detachListenersIfUnused() {
  if (!listenersAttached || nodeList.size > 0) return
  listenersAttached = false
  document.removeEventListener('mousedown', onMouseOrTouchStart)
  document.removeEventListener('mouseup', onMouseOrTouchEnd)
  document.removeEventListener('touchstart', onMouseOrTouchStart)
  document.removeEventListener('touchend', onMouseOrTouchEnd)
}

function createDocumentHandler(el: HTMLElement, binding: DirectiveBinding): DocumentHandler {
  return (mouseup, mousedown) => {
    const popperRef = (binding.instance as ComponentPublicInstance<{ popperRef: HTMLElement }> | null)?.popperRef
    const mouseUpTarget = mouseup.target as Node | null
    const mouseDownTarget = mousedown.target as Node | null

    if (!binding.instance) return
    if (!mouseUpTarget || !mouseDownTarget) return
    if (
      el.contains(mouseUpTarget) ||
      el.contains(mouseDownTarget) ||
      el === mouseUpTarget ||
      (popperRef && (popperRef.contains(mouseUpTarget) || popperRef.contains(mouseDownTarget)))
    )
      return

    binding.value(mouseup, mousedown)
  }
}

const ClickOutside: ObjectDirective = {
  beforeMount(el, binding) {
    nodeList.set(el, { documentHandler: createDocumentHandler(el, binding) })
    attachListeners()
  },
  updated(el, binding) {
    nodeList.set(el, { documentHandler: createDocumentHandler(el, binding) })
  },
  unmounted(el) {
    nodeList.delete(el)
    detachListenersIfUnused()
  },
}

export default ClickOutside
