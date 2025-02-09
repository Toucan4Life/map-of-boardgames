// Based on https://github.com/ElemeFE/element/blob/dev/src/utils/clickoutside.js
// The MIT License (MIT), Copyright (c) 2016 ElemeFE
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

document.addEventListener('mousedown', (e: MouseEvent) => (startClick = e))
document.addEventListener('mouseup', (e) => {
  for (const { documentHandler } of nodeList.values()) {
    documentHandler(e, startClick)
  }
})

// Also hide when tapped outside.
document.addEventListener('touchstart', (e) => (startClick = e))
document.addEventListener('touchend', (e) => {
  for (const { documentHandler } of nodeList.values()) {
    documentHandler(e, startClick)
  }
})

function createDocumentHandler(el: HTMLElement, binding: DirectiveBinding): DocumentHandler {
  return function (mouseup, mousedown) {
    const popperRef = (
      binding.instance as ComponentPublicInstance<{
        popperRef: HTMLElement
      }>
    ).popperRef
    if (
      !binding ||
      !binding.instance ||
      !mouseup.target ||
      !mousedown.target ||
      el.contains(mouseup.target as Node) ||
      el.contains(mousedown.target as Node) ||
      el === mouseup.target ||
      (popperRef && (popperRef.contains(mouseup.target as Node) || popperRef.contains(mousedown.target as Node)))
    ) {
      return
    }
    binding.value()
  }
}

const ClickOutside: ObjectDirective = {
  beforeMount(el: HTMLElement, binding: DirectiveBinding): void {
    nodeList.set(el, {
      documentHandler: createDocumentHandler(el, binding),
      bindingFn: binding.value,
    })
  },
  updated(el: HTMLElement, binding: DirectiveBinding): void {
    nodeList.set(el, {
      documentHandler: createDocumentHandler(el, binding),
      bindingFn: binding.value,
    })
  },
  unmounted(el: HTMLElement): void {
    nodeList.delete(el)
  },
}

export default ClickOutside
