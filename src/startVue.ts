import { createApp } from 'vue'
import App from './App.vue'
import ClickOutside from './lib/clickOutside'

export function startApp() {
  const app = createApp(App)

  app.directive('focus', {
    mounted(el) {
      el.focus()
    },
  })

  app.directive('click-outside', ClickOutside)

  app.mount('#app')
}
