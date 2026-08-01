import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useUiStore = defineStore('ui', () => {
  const sidebarOpen = ref(true)
  const currentView = ref('commits')
  const prevView = ref('commits')   // 進入 Repo Manager 前的視圖，切換 repo 後回到這裡
  const theme = ref(localStorage.getItem('theme') || 'light')
  const commitRefreshKey = ref(0)

  // 套用主題到 <html>（light 加 data-theme="light"，dark 移除 → CSS 預設 dark）
  // 注意：目前 styles.css 為亮色，dark 樣式由 [data-theme="dark"] 覆寫提供
  function applyThemeToDom(value) {
    if (value === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark')
    } else {
      document.documentElement.removeAttribute('data-theme')
    }
  }

  function initTheme() {
    applyThemeToDom(theme.value)
  }

  function toggleSidebar() {
    sidebarOpen.value = !sidebarOpen.value
  }

  function setView(view) {
    currentView.value = view
  }

  function setTheme(value) {
    theme.value = value
    localStorage.setItem('theme', value)
    applyThemeToDom(value)
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
    initTheme,
    triggerCommitRefresh,
  }
})
