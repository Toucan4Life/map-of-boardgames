<script setup lang="ts">
import { ref } from 'vue'
import { getOpenAIModels, getStoredOpenAIKey, storeOpenAIKey } from '../lib/openAIClient.ts'
import ChatList from './ChatList.vue'
import GroupViewModel, { type chatMessage } from '@/lib/GroupViewModel.ts'

const props = defineProps({
  vm: {
    type: GroupViewModel,
    required: true,
  },
  description: {
    type: String,
    required: false,
    default: 'Chat with ChatGPT',
  },
})

const loadingModels = ref(false)
const models = ref<chatMessage[]>()
const errorMessage = ref('')

const enteredToken = ref('')
const openAIToken = ref(getStoredOpenAIKey())
if (openAIToken.value) {
  initializeChat()
}

function saveToken(): void {
  openAIToken.value = enteredToken.value
  storeOpenAIKey(enteredToken.value)
  initializeChat()
}

function initializeChat(): void {
  loadingModels.value = true
  getOpenAIModels()
    .then((gptModels) => {
      loadingModels.value = false
      models.value = gptModels
    })
    .catch((err: unknown) => {
      loadingModels.value = false
      if (err instanceof Error) {
        errorMessage.value = err.message
      }
    })
}

function clearKey(): void {
  localStorage.removeItem('openai-token')
  openAIToken.value = ''
  enteredToken.value = ''
  errorMessage.value = ''
  models.value = []
}
</script>
<template>
  <div>
    <h2>Chat with ChatGPT <a v-if="openAIToken" href="#" class="clear-key" @click="clearKey()">clear key</a></h2>
    <form v-if="!openAIToken" @submit.prevent="saveToken">
      <div>{{ props.description }}</div>
      Enter your <a href="https://platform.openai.com/account/api-keys" target="_blank" class="critical">OpenAI API token</a>
      to get started.
      <div class="input-area">
        <input v-model="enteredToken" type="password" autocomplete="off" class="token-input" />
        <button type="submit">Save to local storage</button>
      </div>
      <p class="note">
        <strong>Note:</strong> This token will be stored in your browser's local storage. It will never be sent to any server other than OpenAI's. See
        our <a href="https://github.com/anvaka/map-of-github/blob/main/src/components/ChatContainer.vue" class="normal">source code</a> for details.
      </p>
    </form>

    <div v-if="loadingModels">Loading models...</div>
    <div v-if="errorMessage">{{ errorMessage }}</div>
    <chat-list v-if="models?.length" :vm="props.vm" :models="models" />
  </div>
</template>

<style scoped>
.token-input {
  font-size: 16px;
  padding: 4px;
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  flex: 1;
  color: var(--color-text);
}

.token-input:focus,
.token-input:active {
  outline: none;
  background-color: var(--color-background-mute);
}

.input-area {
  display: flex;
  margin: 8px 0;
}

a.clear-key {
  font-size: 12px;
  color: var(--color-link-hover);
  text-decoration: none;
  float: right;
}

.note {
  font-size: 12px;
  color: var(--color-text-muted);
}

.note strong {
  font-weight: bold;
}
</style>
