import './assets/main.css'
import { FuzzySearcher } from './lib/createFuzzySearcher.ts'
import { BoardGameMap } from './lib/createMap.ts'
import { startApp } from './startVue'
declare global {
  interface Window {
    mapOwner: BoardGameMap
    fuzzySearcher: FuzzySearcher
  }
}
let vueLoader: HTMLElement | null = document.querySelector('.vue-loading')
let mapLoader: HTMLElement | null = document.querySelector('.map-loading')

if (!webglSupported()) {
  document.body.innerHTML = `<div class='no-webgl'>
    <h4>WebGL is not enabled :(</h4>
    <p>This website needs <a href='https://en.wikipedia.org/wiki/WebGL' class='critical'>WebGL</a> to render a map of boardgames.
    </p> <p>
    You can try another browser. If the problem persists - very likely your video card isn't supported.
    </p>
  </div>`
} else {
  if (vueLoader) vueLoader.innerText = 'Loading Vue containers...'
  if (mapLoader) mapLoader.innerText = 'Loading Map...'

  try {
    mapLoader?.remove()
    mapLoader = null
    window.mapOwner = new BoardGameMap()
    cleanUpLoaderIfNeeded()
  } catch (e: unknown) {
    console.error(e)
    mapLoader?.remove()
    mapLoader = null
    showErrorMessage(e as { message: string })
  }

  try {
    vueLoader?.remove()
    vueLoader = null
    startApp()
    cleanUpLoaderIfNeeded()
  } catch (e: unknown) {
    console.error(e)
    vueLoader?.remove()
    vueLoader = null
    showErrorMessage(e as { message: string })
  }
  window.fuzzySearcher = new FuzzySearcher()
}

function cleanUpLoaderIfNeeded() {
  if (!vueLoader && !mapLoader) {
    document.querySelector('.boot')?.remove()
  }
}

function webglSupported() {
  const canvas = document.createElement('canvas')
  try {
    // Note that { failIfMajorPerformanceCaveat: true } can be passed as a second argument
    // to canvas.getContext(), causing the check to fail if hardware rendering is not available. See
    // https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/getContext
    // for more details.
    const context = canvas.getContext('webgl2')
    if (context && typeof context.getParameter == 'function') {
      return true
    }
  } catch (e: unknown) {
    // WebGL is supported, but disabled
    console.warn(e)
  }
  return false
}

function showErrorMessage(e: { message: string }) {
  document.body.innerHTML = `<div class='no-webgl'>
    <h4>Something went wrong :(</h4>
    <p>
      Please try to reload the page. If the problem persists, please <a href='https://github.com/Toucan4Life/map-of-github/issues' class='critical'>let me know</a>.
    </p>
    <p>
    The error message was: <pre class="error"></pre>
    </p>
  </div>`
  ;(document.querySelector('.error') as HTMLElement).innerText = e.message
}

// Print friendly message to the viewer:
console.log(`%c 👋 Hello there!`, 'font-size: 24px; font-weight: bold;')
console.log('Thank you for checking out source code. You can read it here: ')
console.log('https://github.com/Toucan4Life/map-of-github')
console.log('If you have any questions, please let me know')
