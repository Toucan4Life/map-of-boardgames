import './assets/main.css'
import { createApp } from 'vue'
import { setWorkerUrl } from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import App from './App.vue'
import ClickOutside from './lib/clickOutside'

// Vite can't resolve the worker via import.meta.url the way MapLibre expects, so
// point it at the bundled worker asset explicitly (required for maplibre-gl v6+).
setWorkerUrl(workerUrl)

const vueLoader = document.querySelector('.vue-loading')

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
      <p>Please try to reload the page. If the problem persists, please <a href='https://github.com/Toucan4Life/map-of-boardgames/issues' class='critical'>let me know</a>.</p>
      <p>The error message was: <pre class="error"></pre></p>
    </div>`
  ;(document.querySelector('.error') as HTMLElement).innerText = error.message
}

// Main initialization
function initialize(): void {
  if (!checkWebGLSupport()) {
    showNoWebGLMessage()
    return
  }

  try {
    if (vueLoader) (vueLoader as HTMLElement).innerText = 'Loading Vue containers...'
    const app = createApp(App)

    app.directive('focus', {
      mounted(el) {
        el.focus()
      },
    })
    app.directive('click-outside', ClickOutside)

    app.mount('#app')

    vueLoader?.remove()
    document.querySelector('.boot')?.remove()
  } catch (e: unknown) {
    console.error(e)
    vueLoader?.remove()
    showErrorMessage(e as { message: string })
  }

  // Print welcome message
  console.log(`%c 👋 Hello there!`, 'font-size: 24px; font-weight: bold;')
  console.log('Thank you for checking out source code. You can read it here: ')
  console.log('https://github.com/Toucan4Life/map-of-boardgames')
  console.log('If you have any questions, please let me know')
}

// Start the application
initialize()
