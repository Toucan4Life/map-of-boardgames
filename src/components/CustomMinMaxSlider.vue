<script setup lang="ts">
import { ref, watchEffect } from 'vue'

// define component props for the slider component
const { min, max, step, minValue, maxValue } = defineProps({
  min: {
    type: Number,
    default: 0,
  },
  max: {
    type: Number,
    default: 100,
  },
  step: {
    type: Number,
    default: 1,
  },
  minValue: {
    type: Number,
    default: 50,
  },
  maxValue: {
    type: Number,
    default: 80,
  },
})

// define emits for the slider component
const emit = defineEmits<{
  (e: 'update:minValue', value: number): void
  (e: 'update:maxValue', value: number): void
}>()

// define refs for the slider element and the slider values
const slider = ref<HTMLDivElement>()
const inputMin = ref(null)
const inputMax = ref(null)
const sliderMinValue = ref(minValue)
const sliderMaxValue = ref(maxValue)

// function to get the percentage of a value between the min and max values
const getPercent = (value: number, min: number, max: number) => {
  return ((value - min) / (max - min)) * 100
}

// function to set the css variables for width, left and right
const setCSSProps = (left: number, right: number) => {
  if (slider.value) slider.value.style.setProperty('--progressLeft', `${left}%`)
  if (slider.value) slider.value.style.setProperty('--progressRight', `${right}%`)
}

// watchEffect to emit the updated values, and update the css variables
// when the slider values change
watchEffect(() => {
  if (slider.value) {
    // emit slidet values when updated
    emit('update:minValue', sliderMinValue.value)
    emit('update:maxValue', sliderMaxValue.value)

    // calculate values in percentages
    const leftPercent = getPercent(sliderMinValue.value, min, max)
    const rightPercent = 100 - getPercent(sliderMaxValue.value, min, max)

    // set the CSS variables
    setCSSProps(leftPercent, rightPercent)
  }
})

// validation sliderMinValue do not greater than sliderMaxValue and opposite
const onInput = (payload: Event) => {
  const target = payload.target as HTMLInputElement
  if (!target) return
  if (target.name === 'min') {
    if (parseFloat(target.value) > sliderMaxValue.value) target.value = sliderMaxValue.value.toString()
    else sliderMinValue.value = parseFloat(target.value)
  } else if (target.name === 'max') {
    if (parseFloat(target.value) < sliderMinValue.value) target.value = sliderMinValue.value.toString()
    sliderMaxValue.value = parseFloat(target.value)
  }
}
</script>
<template>
  <div ref="slider" class="custom-slider minmax">
    <div class="minmax-indicator"></div>
    <input ref="inputMin" type="range" name="min" id="min" :min="min" :max="max" :value="minValue" :step="step" @input="onInput" />
    <input ref="inputMax" type="range" name="max" id="max" :min="min" :max="max" :value="maxValue" :step="step" @input="onInput" />
  </div>
  <!-- <div class="minmax-inputs">
    <input type="number" :step="step" v-model="sliderMinValue" />
    <input type="number" :step="step" v-model="sliderMaxValue" />
  </div> -->
</template>
