import './assets/main.css'
import { BoardGameMap } from './lib/createMap.ts'
import { createApp } from 'vue'
import App from './App.vue'
import ClickOutside from './lib/clickOutside'

declare global {
  interface Window {
    mapOwner: BoardGameMap
  }
}

const state = {
  vueLoader: document.querySelector('.vue-loading'),
  mapLoader: document.querySelector('.map-loading'),
}

function checkWebGLSupport(): boolean {
  const canvas = document.createElement('canvas')
  try {
    const context = canvas.getContext('webgl2')
    return !!(context && typeof context.getParameter === 'function')
  } catch (e: unknown) {
    console.warn(e)
    return false
  }
}

function showNoWebGLMessage(): void {
  document.body.innerHTML = `
    <div class='no-webgl'>
      <h4>WebGL is not enabled :(</h4>
      <p>This website needs <a href='https://en.wikipedia.org/wiki/WebGL' class='critical'>WebGL</a> to render a map of boardgames.</p>
      <p>You can try another browser. If the problem persists - very likely your video card isn't supported.</p>
    </div>`
}

function showErrorMessage(error: { message: string }): void {
  document.body.innerHTML = `
    <div class='no-webgl'>
      <h4>Something went wrong :(</h4>
      <p>Please try to reload the page. If the problem persists, please <a href='https://github.com/Toucan4Life/map-of-github/issues' class='critical'>let me know</a>.</p>
      <p>The error message was: <pre class="error"></pre></p>
    </div>`
  ;(document.querySelector('.error') as HTMLElement).innerText = error.message
}

async function safeExecute<T>(operation: () => T | Promise<T>, loaderKey: keyof typeof state, errorHandler = showErrorMessage): Promise<void> {
  try {
    await operation()
    state[loaderKey]?.remove()
    state[loaderKey] = null
    // Clean up boot container if all loaders are removed
    if (!state.vueLoader && !state.mapLoader) {
      document.querySelector('.boot')?.remove()
    }
  } catch (e: unknown) {
    console.error(e)
    state[loaderKey]?.remove()
    state[loaderKey] = null
    errorHandler(e as { message: string })
  }
}

// Main initialization
async function initialize(): Promise<void> {
  if (!checkWebGLSupport()) {
    showNoWebGLMessage()
    return
  }

  await Promise.allSettled([
    safeExecute(() => {
      if (state.mapLoader) (state.mapLoader as HTMLElement).innerText = 'Loading Map...'
      window.mapOwner = new BoardGameMap()
    }, 'mapLoader'),
    safeExecute(() => {
      if (state.vueLoader) (state.vueLoader as HTMLElement).innerText = 'Loading Vue containers...'
      const app = createApp(App)

      app.directive('focus', {
        mounted(el) {
          el.focus()
        },
      })
      app.directive('click-outside', ClickOutside)

      app.mount('#app')
    }, 'vueLoader'),
  ])

  // Print welcome message
  console.log(`%c 👋 Hello there!`, 'font-size: 24px; font-weight: bold;')
  console.log('Thank you for checking out source code. You can read it here: ')
  console.log('https://github.com/Toucan4Life/map-of-github')
  console.log('If you have any questions, please let me know')
}

// Start the application
void initialize()
