import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useUiStore = defineStore('ui', () => {
  const sidebarOpen = ref(true)
  const currentView = ref('changes')
  const theme = ref(localStorage.getItem('theme') || 'light')

  function toggleSidebar() {
    sidebarOpen.value = !sidebarOpen.value
  }

  function setView(view) {
    currentView.value = view
  }

  function setTheme(value) {
    theme.value = value
    localStorage.setItem('theme', value)
  }

  const isDark = computed(() => theme.value === 'dark')

  return {
    sidebarOpen,
    currentView,
    theme,
    isDark,
    toggleSidebar,
    setView,
    setTheme,
  }
})
