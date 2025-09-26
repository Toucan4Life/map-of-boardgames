<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { LngLat, Map, Popup, type LngLatLike } from 'maplibre-gl'

const props = defineProps<{
  map: Map
  lngLat: LngLatLike
  defaultText?: string | null
  onSave: (value: string, lnglat: LngLat) => void
}>()

const emit = defineEmits<{
  (e: 'closed'): void
}>()

const inputValue = ref(props.defaultText ?? '')
let popup: Popup | null = null
let keyHandler: ((e: KeyboardEvent) => void) | null = null

function submit(e: Event) {
  if (!popup) return
  e.preventDefault()
  const value = (popup.getElement().querySelector('input') as HTMLInputElement)?.value
  props.onSave(value, popup.getLngLat())
  close()
}

function close() {
  popup?.remove()
  popup = null
  if (keyHandler) document.removeEventListener('keydown', keyHandler)
  keyHandler = null
  emit('closed')
}

onMounted(() => {
  // Create container for Vue template
  const container = document.createElement('div')
  container.className = 'label-marker'
  container.appendChild(document.querySelector<HTMLTemplateElement>('#vue-marker-template')!.content.cloneNode(true))

  // Wire up DOM inside container
  const form = container.querySelector('form')
  const input = container.querySelector<HTMLInputElement>('input')
  const cancelBtn = container.querySelector('.cancel')
  const saveBtn = container.querySelector('.accept')
  if (input) input.value = inputValue.value

  form?.addEventListener('submit', submit)
  cancelBtn?.addEventListener('click', (e) => {
    e.preventDefault()
    close()
  })
  saveBtn?.addEventListener('click', (e) => {
    e.preventDefault()
    submit(e)
  })

  container.addEventListener('pointerdown', (e) => {
    if (!popup) return
    const startX = e.clientX
    const startY = e.clientY
    const marker = props.map.project(popup.getLngLat())
    const dx = marker.x - startX
    const dy = marker.y - startY

    const move = (ev: PointerEvent) => {
      if (!popup) return
      const newLngLat = props.map.unproject([ev.clientX + dx, ev.clientY + dy])
      popup.setLngLat(newLngLat)
    }
    const up = () => {
      window.removeEventListener('pointermove', move, true)
      window.removeEventListener('pointerup', up, true)
    }
    window.addEventListener('pointermove', move, true)
    window.addEventListener('pointerup', up, true)
  })

  keyHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      close()
      e.preventDefault()
    }
  }
  document.addEventListener('keydown', keyHandler)

  popup = new Popup({ closeButton: false }).setLngLat(props.lngLat).setDOMContent(container).addTo(props.map)
})

onUnmounted(() => {
  close()
})
</script>

<template>
  <!-- template cloned into DOM container -->
  <template id="vue-marker-template">
    <form class="mini-label">
      <input type="text" placeholder="Label" />
      <div class="commands">
        <a href="#" class="cancel" tabindex="3">Cancel</a>
        <a href="#" class="accept">Save</a>
      </div>
    </form>
  </template>
</template>
