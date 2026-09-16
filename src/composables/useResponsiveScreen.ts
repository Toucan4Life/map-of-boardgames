import { ref, onBeforeMount, onBeforeUnmount } from 'vue'

const SM_SCREEN_BREAKPOINT = 640

/** Tracks whether the viewport is at/below the small-screen breakpoint, updating on resize. */
export function useResponsiveScreen() {
  const isSmallScreen = ref(window.innerWidth < SM_SCREEN_BREAKPOINT)

  const updateScreenSize = () => {
    isSmallScreen.value = window.innerWidth < SM_SCREEN_BREAKPOINT
  }

  onBeforeMount(() => { window.addEventListener('resize', updateScreenSize); })
  onBeforeUnmount(() => { window.removeEventListener('resize', updateScreenSize); })

  return { isSmallScreen }
}
