import './assets/main.css'
import { createApp } from 'vue'
import App from './App.vue'
import createFuzzySearcher from './lib/createFuzzySearcher.js';


createApp(App).mount('#app')


// This is kind of bad, but also make searching available in the console and easier to
// hook with type-ahead.
window.fuzzySearcher = createFuzzySearcher();