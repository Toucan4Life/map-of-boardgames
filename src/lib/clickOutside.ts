// Based on https://github.com/element-plus/element-plus/blob/master/packages/directives/click-outside/index.ts
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

const isElement = (e: unknown): e is Element => {
  if (typeof Element === 'undefined') return false
  return e instanceof Element
}
function createDocumentHandler(el: HTMLElement, binding: DirectiveBinding): DocumentHandler {
  let excludes: HTMLElement[] = []
  if (Array.isArray(binding.arg)) {
    excludes = binding.arg
  } else if (isElement(binding.arg)) {
    // due to current implementation on binding type is wrong the type casting is necessary here
    excludes.push(binding.arg as unknown as HTMLElement)
  }
  return function (mouseup, mousedown) {
    const popperRef = (
      binding.instance as ComponentPublicInstance<{
        popperRef: HTMLElement
      }> | null
    )?.popperRef
    const mouseUpTarget = mouseup.target as Node | null
    const mouseDownTarget = mousedown.target as Node
    const isBound = !binding.instance
    const isTargetExists = !mouseUpTarget || !mouseDownTarget
    const isContainedByEl = el.contains(mouseUpTarget) || el.contains(mouseDownTarget)
    const isSelf = el === mouseUpTarget

    const isTargetExcluded =
      (excludes.length && excludes.some((item) => item.contains(mouseUpTarget))) ||
      (excludes.length && excludes.includes(mouseDownTarget as HTMLElement))
    const isContainedByPopper = popperRef && (popperRef.contains(mouseUpTarget) || popperRef.contains(mouseDownTarget))
    if (isBound || isTargetExists || isContainedByEl || isSelf || isTargetExcluded || isContainedByPopper) {
      return
    }
    binding.value(mouseup, mousedown)
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
