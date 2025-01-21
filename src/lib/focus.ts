const focus = {
  mounted: (el: HTMLElement) => el.focus()
}

export default {
  directives: {
    // enables v-focus in template
    focus
  }
}