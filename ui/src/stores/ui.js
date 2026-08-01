import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useUiStore = defineStore('ui', () => {
  const sidebarOpen = ref(true)
  const currentView = ref('commits')
  const prevView = ref('commits')   // 進入 Repo Manager 前的視圖，切換 repo 後回到這裡
  const theme = ref(localStorage.getItem('theme') || 'light')
  const commitRefreshKey = ref(0)

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

  function triggerCommitRefresh() {
    commitRefreshKey.value++
  }

  const isDark = computed(() => theme.value === 'dark')

  return {
    sidebarOpen,
    currentView,
    prevView,
    theme,
    isDark,
    commitRefreshKey,
    toggleSidebar,
    setView,
    setTheme,
    triggerCommitRefresh,
  }
})
