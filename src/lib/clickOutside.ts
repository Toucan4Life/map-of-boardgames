import type { ComponentPublicInstance, DirectiveBinding, ObjectDirective } from 'vue'

type DocumentHandler = <T extends Event>(mouseup: T, mousedown: T) => void
type FlushList = Map<
  HTMLElement,
  {
    documentHandler: DocumentHandler
    bindingFn: (...args: unknown[]) => unknown
  }
>
const nodeList: FlushList = new Map()

let startClick: MouseEvent | TouchEvent

document.addEventListener('mousedown', (e) => (startClick = e))
document.addEventListener('mouseup', (e) => {
  for (const { documentHandler } of nodeList.values()) documentHandler(e, startClick)
})
document.addEventListener('touchstart', (e) => (startClick = e))
document.addEventListener('touchend', (e) => {
  for (const { documentHandler } of nodeList.values()) documentHandler(e, startClick)
})

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
    nodeList.set(el, {
      documentHandler: createDocumentHandler(el, binding),
      bindingFn: binding.value,
    })
  },
  updated(el, binding) {
    nodeList.set(el, {
      documentHandler: createDocumentHandler(el, binding),
      bindingFn: binding.value,
    })
  },
  unmounted(el) {
    nodeList.delete(el)
  },
}

export default ClickOutside
