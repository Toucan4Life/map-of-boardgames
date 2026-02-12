<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="isOpen" class="base-modal-overlay" @click="handleOverlayClick">
        <div
          ref="modalRef"
          :class="['base-modal', `base-modal--${size}`]"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="title ? 'modal-title' : undefined"
          @click.stop
        >
          <!-- Header -->
          <div v-if="showHeader" class="base-modal__header">
            <h2 v-if="title" id="modal-title" class="base-modal__title">{{ title }}</h2>
            <slot name="header"></slot>
            <BaseIconButton v-if="showClose" variant="ghost" size="md" ariaLabel="Close modal" @click="handleClose">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="15" y1="9" x2="9" y2="15"></line>
                <line x1="9" y1="9" x2="15" y2="15"></line>
              </svg>
            </BaseIconButton>
          </div>

          <!-- Content -->
          <div class="base-modal__content">
            <slot></slot>
          </div>

          <!-- Footer -->
          <div v-if="$slots.footer" class="base-modal__footer">
            <slot name="footer"></slot>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import BaseIconButton from './BaseIconButton.vue'

const props = defineProps<{
  isOpen: boolean
  title?: string
  showHeader?: boolean
  showClose?: boolean
  closeOnOverlay?: boolean
  closeOnEscape?: boolean
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
}>()

const emit = defineEmits<{
  close: []
  'update:isOpen': [value: boolean]
}>()

const modalRef = ref<HTMLElement>()
let previousActiveElement: HTMLElement | null = null

function handleClose() {
  emit('close')
  emit('update:isOpen', false)
}

function handleOverlayClick() {
  if (props.closeOnOverlay) {
    handleClose()
  }
}

function handleEscape(event: KeyboardEvent) {
  if (event.key === 'Escape' && props.isOpen && props.closeOnEscape) {
    handleClose()
  }
}

// Focus trap - simple implementation
function trapFocus(event: KeyboardEvent) {
  if (!props.isOpen || !modalRef.value) return

  const focusableElements = modalRef.value.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
  const firstElement = focusableElements[0] as HTMLElement
  const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

  if (event.key === 'Tab') {
    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault()
      lastElement?.focus()
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault()
      firstElement?.focus()
    }
  }
}

// Manage focus and body scroll
watch(
  () => props.isOpen,
  async (isOpen) => {
    if (isOpen) {
      previousActiveElement = document.activeElement as HTMLElement
      document.body.style.overflow = 'hidden'

      await nextTick()

      // Focus first focusable element or modal itself
      const focusableElements = modalRef.value?.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
      if (focusableElements && focusableElements.length > 0) {
        ;(focusableElements[0] as HTMLElement).focus()
      } else {
        modalRef.value?.focus()
      }
    } else {
      document.body.style.overflow = ''
      previousActiveElement?.focus()
      previousActiveElement = null
    }
  },
)

onMounted(() => {
  document.addEventListener('keydown', handleEscape)
  document.addEventListener('keydown', trapFocus)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleEscape)
  document.removeEventListener('keydown', trapFocus)
  document.body.style.overflow = ''
})
</script>

<script lang="ts">
export default {
  name: 'BaseModal',
}
</script>

<style scoped>
.base-modal-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.5);
  backdrop-filter: var(--backdrop-blur-sm);
  z-index: var(--z-modal);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);
  overflow-y: auto;
}

.base-modal {
  background-color: var(--color-background);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-2xl);
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - var(--space-8));
  width: 100%;
  border: 1px solid var(--color-border);
}

/* Size Variants */
.base-modal--sm {
  max-width: 400px;
}

.base-modal--md {
  max-width: 600px;
}

.base-modal--lg {
  max-width: 800px;
}

.base-modal--xl {
  max-width: 1000px;
}

.base-modal--full {
  max-width: calc(100vw - var(--space-8));
  max-height: calc(100vh - var(--space-8));
}

/* Header */
.base-modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-5);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.base-modal__title {
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  color: var(--color-heading);
  margin: 0;
}

/* Content */
.base-modal__content {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-5);
}

/* Footer */
.base-modal__footer {
  padding: var(--space-5);
  border-top: 1px solid var(--color-border);
  flex-shrink: 0;
  display: flex;
  gap: var(--space-3);
  justify-content: flex-end;
}

/* Transitions */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity var(--duration-normal) var(--ease-out);
}

.modal-fade-enter-active .base-modal,
.modal-fade-leave-active .base-modal {
  transition: transform var(--duration-normal) var(--ease-emphasized);
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-enter-from .base-modal,
.modal-fade-leave-to .base-modal {
  transform: scale(0.95) translateY(-20px);
}

/* Mobile Responsive */
@media (max-width: 640px) {
  .base-modal-overlay {
    padding: 0;
    align-items: flex-end;
  }

  .base-modal {
    max-height: 90vh;
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  }

  .base-modal__header {
    padding: var(--space-4);
  }

  .base-modal__content {
    padding: var(--space-4);
  }

  .base-modal__footer {
    padding: var(--space-4);
    flex-direction: column;
  }

  .base-modal__footer > * {
    width: 100%;
  }

  .modal-fade-enter-from .base-modal,
  .modal-fade-leave-to .base-modal {
    transform: translateY(100%);
  }
}
</style>
