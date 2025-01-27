import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  //needed because of this bug https://github.com/vitejs/vite/issues/16522
  server: { host: '127.0.0.1' }
  // build: {
  //   sourcemap: true,
  // },
  // resolve: {
  //   alias: {
  //     '@': fileURLToPath(new URL('./src', import.meta.url))
  //   }
  // }
})
